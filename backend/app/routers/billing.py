"""Billing router — Stripe Checkout, Portal, webhook."""

import logging

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.config import settings
from app.auth.dependencies import CurrentUser
from app.db.engine import get_session
from app.db.models import Organization, User
from app.services.billing_service import (
    PLAN_PAGE_LIMITS,
    create_checkout_session,
    create_portal_session,
    cancel_subscription,
    revert_to_free,
    sync_subscription,
    price_to_plan,
    plan_to_page_limit,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Request / response models ────────────────────────────────────────
class CheckoutRequest(BaseModel):
    plan: str  # "starter" | "pro" | "business"
    success_url: str
    cancel_url: str


class UrlResponse(BaseModel):
    url: str


class BillingStatusResponse(BaseModel):
    plan: str
    page_limit: int | None
    month_pages: int
    stripe_subscription_id: str | None
    current_period_end: int | None  # unix timestamp
    cancel_at_period_end: bool = False


class PortalRequest(BaseModel):
    return_url: str


# ── Endpoints ────────────────────────────────────────────────────────
@router.post("/billing/checkout", response_model=UrlResponse)
async def billing_checkout(
    body: CheckoutRequest,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
):
    if body.plan not in ("starter", "pro", "business"):
        raise HTTPException(status_code=400, detail="Invalid plan")

    org = await session.get(Organization, current_user.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # If they already have an active subscription, send them to the portal instead
    if org.stripe_subscription_id:
        raise HTTPException(
            status_code=400,
            detail="You already have an active subscription. Use the customer portal to change plans.",
        )

    org.checkout_stage = "started"
    session.add(org)
    await session.commit()
    await session.refresh(org)

    url = await create_checkout_session(
        org=org,
        user=current_user,
        plan=body.plan,
        success_url=body.success_url,
        cancel_url=body.cancel_url,
        session=session,
    )

    _notify_checkout(
        subject=f"Checkout started: {current_user.full_name} ({body.plan})",
        body=(
            f"<h3>Checkout started</h3>"
            f"<p><strong>Name:</strong> {current_user.full_name}</p>"
            f"<p><strong>Email:</strong> {current_user.email}</p>"
            f"<p><strong>Organization:</strong> {org.name}</p>"
            f"<p><strong>Plan:</strong> {body.plan}</p>"
            f"<p>User was redirected to the Stripe checkout page.</p>"
        ),
    )

    return UrlResponse(url=url)


@router.post("/billing/portal", response_model=UrlResponse)
async def billing_portal(
    body: PortalRequest,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
):
    org = await session.get(Organization, current_user.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if not org.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No billing account found. Subscribe to a plan first.")

    url = await create_portal_session(
        org=org,
        user=current_user,
        return_url=body.return_url,
        session=session,
    )
    return UrlResponse(url=url)


@router.post("/billing/sync")
async def billing_sync(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
):
    """Pull current subscription from Stripe and sync to DB (used after checkout redirect)."""
    org = await session.get(Organization, current_user.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if not org.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No billing account found")

    stripe.api_key = settings.stripe_secret_key
    subscriptions = stripe.Subscription.list(
        customer=org.stripe_customer_id, status="active", limit=1
    )

    if subscriptions.data:
        sub = subscriptions.data[0]
        await sync_subscription(org, sub, session)
        return {"detail": "Subscription synced", "plan": org.plan}
    else:
        await revert_to_free(org, session)
        return {"detail": "No active subscription found", "plan": "free"}


@router.post("/billing/cancel")
async def billing_cancel(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
):
    org = await session.get(Organization, current_user.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if not org.stripe_subscription_id:
        raise HTTPException(status_code=400, detail="No active subscription to cancel")

    await cancel_subscription(org)
    # Don't revert to free yet — they keep their plan until the period ends.
    # The customer.subscription.deleted webhook will handle the revert.
    return {"detail": "Subscription will be cancelled at the end of your billing period."}


@router.get("/billing/status", response_model=BillingStatusResponse)
async def billing_status(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
):
    org = await session.get(Organization, current_user.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    current_period_end: int | None = None
    cancel_at_period_end = False
    if org.stripe_subscription_id:
        try:
            stripe.api_key = settings.stripe_secret_key
            sub = stripe.Subscription.retrieve(org.stripe_subscription_id)
            # In newer Stripe API versions, current_period_end moved to item level
            current_period_end = sub.get("current_period_end")
            if current_period_end is None and sub.get("items") and sub["items"].get("data"):
                current_period_end = sub["items"]["data"][0].get("current_period_end")
            cancel_at_period_end = sub.get("cancel_at_period_end", False)
        except Exception:
            logger.exception("Failed to fetch subscription details from Stripe")

    return BillingStatusResponse(
        plan=org.plan,
        page_limit=org.page_limit,
        month_pages=org.month_pages,
        stripe_subscription_id=org.stripe_subscription_id,
        current_period_end=current_period_end,
        cancel_at_period_end=cancel_at_period_end,
    )


# ── Webhook (no auth — verified by Stripe signature) ────────────────
@router.post("/billing/webhook")
async def billing_webhook(
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event["type"]
    data = event["data"]["object"]
    logger.info("Stripe webhook: %s", event_type)

    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(data, session)
    elif event_type == "checkout.session.expired":
        await _handle_checkout_expired(data, session)
    elif event_type == "customer.subscription.updated":
        await _handle_subscription_updated(data, session)
    elif event_type == "customer.subscription.deleted":
        await _handle_subscription_deleted(data, session)
    elif event_type == "invoice.payment_failed":
        await _handle_payment_failed(data, session)

    return {"received": True}


# ── Admin notification helper ────────────────────────────────────────
def _notify_checkout(subject: str, body: str) -> None:
    """Send a fire-and-forget admin email about a checkout event."""
    if not settings.resend_api_key or not settings.contact_email:
        return
    try:
        import resend

        resend.api_key = settings.resend_api_key
        resend.Emails.send({
            "from": "BankRead <no-reply@bankread.ai>",
            "to": [settings.contact_email],
            "subject": subject,
            "html": body,
        })
    except Exception:
        logger.exception("Failed to send checkout notification email")


async def _find_org_owner(org_id, session: AsyncSession) -> User | None:
    """Find the owner user of an organization."""
    result = await session.execute(
        select(User).where(User.org_id == org_id, User.role == "owner")
    )
    return result.scalar_one_or_none()


# ── Webhook handlers ─────────────────────────────────────────────────
async def _handle_checkout_completed(data: dict, session: AsyncSession) -> None:
    """Link the new subscription to the org after Checkout."""
    subscription_id = data.get("subscription")
    customer_id = data.get("customer")
    if not subscription_id or not customer_id:
        return

    org = await _find_org_by_customer(customer_id, session)
    if not org:
        logger.warning("Checkout completed for unknown customer: %s", customer_id)
        return

    stripe.api_key = settings.stripe_secret_key
    subscription = stripe.Subscription.retrieve(subscription_id)
    await sync_subscription(org, subscription, session)

    org.checkout_stage = "completed"
    session.add(org)
    await session.commit()

    plan = data.get("metadata", {}).get("plan", org.plan)
    owner = await _find_org_owner(org.id, session)
    owner_name = owner.full_name if owner else "Unknown"
    owner_email = owner.email if owner else "Unknown"

    _notify_checkout(
        subject=f"Checkout completed: {owner_name} ({plan})",
        body=(
            f"<h3>Payment successful</h3>"
            f"<p><strong>Name:</strong> {owner_name}</p>"
            f"<p><strong>Email:</strong> {owner_email}</p>"
            f"<p><strong>Organization:</strong> {org.name}</p>"
            f"<p><strong>Plan:</strong> {plan}</p>"
            f"<p>Subscription is now active.</p>"
        ),
    )


async def _handle_checkout_expired(data: dict, session: AsyncSession) -> None:
    """Handle abandoned checkout — session expired without completing."""
    customer_id = data.get("customer")
    if not customer_id:
        return

    org = await _find_org_by_customer(customer_id, session)
    if not org:
        logger.warning("Checkout expired for unknown customer: %s", customer_id)
        return

    org.checkout_stage = "abandoned"
    session.add(org)
    await session.commit()

    plan = data.get("metadata", {}).get("plan", "unknown")
    owner = await _find_org_owner(org.id, session)
    owner_name = owner.full_name if owner else "Unknown"
    owner_email = owner.email if owner else "Unknown"

    _notify_checkout(
        subject=f"Checkout abandoned: {owner_name} ({plan})",
        body=(
            f"<h3>Checkout abandoned</h3>"
            f"<p><strong>Name:</strong> {owner_name}</p>"
            f"<p><strong>Email:</strong> {owner_email}</p>"
            f"<p><strong>Organization:</strong> {org.name}</p>"
            f"<p><strong>Plan:</strong> {plan}</p>"
            f"<p>User started checkout but never completed payment. "
            f"The Stripe session expired.</p>"
        ),
    )


async def _handle_subscription_updated(data: dict, session: AsyncSession) -> None:
    """Handle plan changes (upgrade/downgrade)."""
    customer_id = data.get("customer")
    if not customer_id:
        return

    org = await _find_org_by_customer(customer_id, session)
    if not org:
        logger.warning("Subscription updated for unknown customer: %s", customer_id)
        return

    stripe.api_key = settings.stripe_secret_key
    subscription = stripe.Subscription.retrieve(data["id"])
    await sync_subscription(org, subscription, session)


async def _handle_subscription_deleted(data: dict, session: AsyncSession) -> None:
    """Revert to free plan on cancellation."""
    customer_id = data.get("customer")
    if not customer_id:
        return

    org = await _find_org_by_customer(customer_id, session)
    if not org:
        logger.warning("Subscription deleted for unknown customer: %s", customer_id)
        return

    await revert_to_free(org, session)


async def _handle_payment_failed(data: dict, session: AsyncSession) -> None:
    """Log payment failure and notify admin."""
    customer_id = data.get("customer")
    logger.warning("Payment failed for customer: %s", customer_id)

    if not customer_id:
        return

    org = await _find_org_by_customer(customer_id, session)
    if not org:
        return

    org.checkout_stage = "payment_failed"
    session.add(org)
    await session.commit()

    owner = await _find_org_owner(org.id, session)
    owner_name = owner.full_name if owner else "Unknown"
    owner_email = owner.email if owner else "Unknown"

    _notify_checkout(
        subject=f"Payment failed: {owner_name} ({org.plan})",
        body=(
            f"<h3>Payment failed</h3>"
            f"<p><strong>Name:</strong> {owner_name}</p>"
            f"<p><strong>Email:</strong> {owner_email}</p>"
            f"<p><strong>Organization:</strong> {org.name}</p>"
            f"<p><strong>Current plan:</strong> {org.plan}</p>"
            f"<p>Stripe invoice payment failed. This could be a declined card "
            f"or insufficient funds.</p>"
        ),
    )


async def _find_org_by_customer(
    customer_id: str, session: AsyncSession
) -> Organization | None:
    """Look up an organization by its Stripe customer ID."""
    result = await session.execute(
        select(Organization).where(Organization.stripe_customer_id == customer_id)
    )
    return result.scalar_one_or_none()
