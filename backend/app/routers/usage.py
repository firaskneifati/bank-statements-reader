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

    # Lazy monthly reset: if usage_reset_at is in a previous month, zero monthly counters
    now = datetime.utcnow()
    if org and (
        org.usage_reset_at.year < now.year
        or org.usage_reset_at.month < now.month
    ):
        org.month_uploads = 0
        org.month_documents = 0
        org.month_pages = 0
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
        total_transactions=org.total_transactions if org else 0,
        total_exports=org.total_exports if org else 0,
        total_bytes_processed=org.total_bytes_processed if org else 0,
        month_uploads=org.month_uploads if org else 0,
        month_documents=org.month_documents if org else 0,
        month_pages=org.month_pages if org else 0,
        month_transactions=org.month_transactions if org else 0,
        month_exports=org.month_exports if org else 0,
        month_bytes_processed=org.month_bytes_processed if org else 0,
        page_limit=org.page_limit if org else None,
    )
