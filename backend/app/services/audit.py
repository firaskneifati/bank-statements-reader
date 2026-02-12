import logging
from uuid import UUID

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import AuditLog

logger = logging.getLogger(__name__)


async def log_audit(
    session: AsyncSession,
    action: str,
    request: Request,
    user_id: UUID | None = None,
    org_id: UUID | None = None,
    detail: str | None = None,
) -> None:
    if not settings.audit_log_enabled:
        return
    """Write a single row to audit_logs. Commits independently so it
    never blocks the caller's main transaction on failure."""
    try:
        ip = request.client.host if request.client else None
        ua = request.headers.get("user-agent")

        entry = AuditLog(
            org_id=org_id,
            user_id=user_id,
            action=action,
            detail=detail,
            ip_address=ip,
            user_agent=ua,
        )
        session.add(entry)
        await session.commit()
    except Exception:
        logger.exception("Failed to write audit log for action=%s", action)
        await session.rollback()
