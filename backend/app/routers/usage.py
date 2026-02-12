from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import UsageStats
from app.auth.dependencies import CurrentUser
from app.db.engine import get_session
from app.db.models import Organization

router = APIRouter()


@router.get("/usage", response_model=UsageStats)
async def get_usage(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
):
    org = await session.get(Organization, current_user.org_id)

    # Lazy monthly reset for free plan: 30-day rolling period from usage_reset_at.
    # Paid plans have their counters reset via Stripe webhook on billing period renewal.
    now = datetime.utcnow()
    if org and not org.stripe_subscription_id:
        days_since_reset = (now - org.usage_reset_at).days
        if days_since_reset >= 30:
            org.month_uploads = 0
            org.month_documents = 0
            org.month_pages = 0
            org.month_actual_pages = 0
            org.month_text_pages = 0
            org.month_image_pages = 0
            org.month_transactions = 0
            org.month_exports = 0
            org.month_bytes_processed = 0
            org.usage_reset_at = now
            session.add(org)
            await session.commit()
            await session.refresh(org)

    return UsageStats(
        total_uploads=org.total_uploads if org else 0,
        total_documents=org.total_documents if org else 0,
        total_pages=org.total_pages if org else 0,
        total_actual_pages=org.total_actual_pages if org else 0,
        total_text_pages=org.total_text_pages if org else 0,
        total_image_pages=org.total_image_pages if org else 0,
        total_transactions=org.total_transactions if org else 0,
        total_exports=org.total_exports if org else 0,
        total_bytes_processed=org.total_bytes_processed if org else 0,
        month_uploads=org.month_uploads if org else 0,
        month_documents=org.month_documents if org else 0,
        month_pages=org.month_pages if org else 0,
        month_actual_pages=org.month_actual_pages if org else 0,
        month_text_pages=org.month_text_pages if org else 0,
        month_image_pages=org.month_image_pages if org else 0,
        month_transactions=org.month_transactions if org else 0,
        month_exports=org.month_exports if org else 0,
        month_bytes_processed=org.month_bytes_processed if org else 0,
        page_limit=org.page_limit if org else None,
        plan=org.plan if org else "free",
    )
