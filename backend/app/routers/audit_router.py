from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func, col
from datetime import datetime
from uuid import UUID

from app.auth.dependencies import CurrentUser
from app.db.engine import get_session
from app.db.models import AuditLog, User

router = APIRouter()


class AuditLogEntry(BaseModel):
    id: UUID
    action: str
    detail: str | None
    ip_address: str | None
    user_email: str | None
    created_at: datetime


class AuditLogPage(BaseModel):
    items: list[AuditLogEntry]
    total: int
    page: int
    per_page: int


@router.get("/audit-logs", response_model=AuditLogPage)
async def list_audit_logs(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
    action: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
):
    if current_user.role not in ("owner", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner or admin role required")

    # Base filter: only logs for this org
    conditions = [AuditLog.org_id == current_user.org_id]
    if action:
        conditions.append(AuditLog.action == action)

    # Count
    count_q = select(func.count()).select_from(AuditLog).where(*conditions)
    total = (await session.execute(count_q)).scalar_one()

    # Fetch page with user email via outer join
    q = (
        select(AuditLog, User.email)
        .outerjoin(User, AuditLog.user_id == User.id)
        .where(*conditions)
        .order_by(col(AuditLog.created_at).desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    rows = (await session.execute(q)).all()

    items = [
        AuditLogEntry(
            id=log.id,
            action=log.action,
            detail=log.detail,
            ip_address=log.ip_address,
            user_email=email,
            created_at=log.created_at,
        )
        for log, email in rows
    ]

    return AuditLogPage(items=items, total=total, page=page, per_page=per_page)
