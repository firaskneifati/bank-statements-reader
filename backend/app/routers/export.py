import logging
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import ExportRequest as ExportRequestSchema
from app.services.export_service import generate_csv, generate_excel
from app.auth.dependencies import CurrentUser
from app.db.engine import get_session
from app.db.models import ExportLog, Organization
from app.services.audit import log_audit

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/export")
async def export_transactions(
    request: Request,
    body: ExportRequestSchema,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
):
    if not body.transactions:
        raise HTTPException(status_code=400, detail="No transactions to export")

    # Record export usage in DB
    try:
        export_log = ExportLog(
            org_id=current_user.org_id,
            user_id=current_user.id,
            format=body.format,
            transaction_count=len(body.transactions),
        )
        session.add(export_log)

        org = await session.get(Organization, current_user.org_id)
        if org:
            org.total_exports += 1
            org.month_exports += 1
            session.add(org)

        await session.commit()
        await log_audit(
            session, "export", request,
            user_id=current_user.id, org_id=current_user.org_id,
            detail=f"{body.format}, {len(body.transactions)} transactions",
        )
    except Exception:
        logger.exception("Failed to record export usage")
        await session.rollback()

    if body.format == "csv":
        output = generate_csv(body.transactions)
        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{body.filename}.csv"'
            },
        )
    elif body.format == "xlsx":
        output = generate_excel(body.transactions)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f'attachment; filename="{body.filename}.xlsx"'
            },
        )
    else:
        raise HTTPException(
            status_code=400, detail=f"Unsupported format: {body.format}"
        )
