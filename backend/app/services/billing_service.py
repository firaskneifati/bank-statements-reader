"""Stripe billing service — checkout, portal, subscription sync."""

import logging
from datetime import datetime

import stripe
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import Organization, User

logger = logging.getLogger(__name__)

# ── Plan tier mapping ────────────────────────────────────────────────
PLAN_PAGE_LIMITS: dict[str, int] = {
    "free": 50,
    "starter": 500,
    "pro": 2_000,
    "business": 10_000,
}


def _init_stripe() -> None:
    stripe.api_key = settings.stripe_secret_key


def price_to_plan(price_id: str) -> str:
    """Map a Stripe price ID to our plan name."""
    mapping = {
        settings.stripe_price_starter: "starter",
        settings.stripe_price_pro: "pro",
        settings.stripe_price_business: "business",
    }
    return mapping.get(price_id, "free")


def plan_to_price_id(plan: str) -> str | None:
    """Map a plan name to the Stripe price ID."""
    mapping = {
        "starter": settings.stripe_price_starter,
        "pro": settings.stripe_price_pro,
        "business": settings.stripe_price_business,
    }
    return mapping.get(plan)


def plan_to_page_limit(plan: str) -> int:
    """Return the page limit for a given plan."""
    return PLAN_PAGE_LIMITS.get(plan, 50)


async def get_or_create_customer(
    org: Organization, user: User, session: AsyncSession
) -> str:
    """Return existing Stripe customer ID or create one and persist it."""
    if org.stripe_customer_id:
        return org.stripe_customer_id

    _init_stripe()
    customer = stripe.Customer.create(
        name=org.name,
        email=user.email,
        metadata={"org_id": str(org.id)},
    )
    org.stripe_customer_id = customer.id
    session.add(org)
    await session.commit()
    await session.refresh(org)
    return customer.id


async def create_checkout_session(
    org: Organization,
    user: User,
    plan: str,
    success_url: str,
    cancel_url: str,
    session: AsyncSession,
) -> str:
    """Create a Stripe Checkout session and return the URL."""
    price_id = plan_to_price_id(plan)
    if not price_id:
        raise ValueError(f"No Stripe price configured for plan: {plan}")

    customer_id = await get_or_create_customer(org, user, session)
    _init_stripe()

    checkout = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"org_id": str(org.id)},
    )
    return checkout.url


async def create_portal_session(
    org: Organization,
    user: User,
    return_url: str,
    session: AsyncSession,
) -> str:
    """Create a Stripe Customer Portal session and return the URL."""
    customer_id = await get_or_create_customer(org, user, session)
    _init_stripe()

    portal = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url,
    )
    return portal.url


async def sync_subscription(
    org: Organization,
    subscription,
    session: AsyncSession,
) -> None:
    """Update org fields from a Stripe subscription object."""
    items = subscription.get("items", {}).get("data", []) if isinstance(subscription, dict) else (subscription["items"]["data"] if subscription.get("items") else [])
    if items:
        price_id = items[0]["price"]["id"]
        plan = price_to_plan(price_id)
    else:
        price_id = None
        plan = "free"

    org.stripe_subscription_id = subscription["id"]
    org.stripe_price_id = price_id
    org.plan = plan
    org.page_limit = plan_to_page_limit(plan)

    # Align usage reset with Stripe billing period
    period_start = subscription.get("current_period_start")
    if period_start:
        new_reset = datetime.utcfromtimestamp(period_start)
        # If the billing period advanced past our last reset, zero the monthly counters
        if new_reset > org.usage_reset_at:
            org.month_uploads = 0
            org.month_documents = 0
            org.month_pages = 0
            org.month_transactions = 0
            org.month_exports = 0
            org.month_bytes_processed = 0
            org.usage_reset_at = new_reset
            logger.info("Reset monthly counters for org %s (new period: %s)", org.id, new_reset)

    session.add(org)
    await session.commit()
    await session.refresh(org)
    logger.info("Synced org %s → plan=%s, page_limit=%d", org.id, plan, org.page_limit)


async def cancel_subscription(org: Organization) -> None:
    """Cancel a Stripe subscription at the end of the current billing period."""
    if not org.stripe_subscription_id:
        raise ValueError("Organization has no active subscription")

    _init_stripe()
    stripe.Subscription.modify(
        org.stripe_subscription_id,
        cancel_at_period_end=True,
    )


async def revert_to_free(org: Organization, session: AsyncSession) -> None:
    """Revert org to the free plan after cancellation."""
    org.stripe_subscription_id = None
    org.stripe_price_id = None
    org.plan = "free"
    org.page_limit = plan_to_page_limit("free")
    session.add(org)
    await session.commit()
    await session.refresh(org)
    logger.info("Reverted org %s to free plan", org.id)
