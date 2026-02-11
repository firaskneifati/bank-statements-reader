from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.models.transaction import ExportRequest
from app.services.export_service import generate_csv, generate_excel
from app.auth.dependencies import CurrentUser

router = APIRouter()


@router.post("/export")
async def export_transactions(request: ExportRequest, current_user: CurrentUser):
    if not request.transactions:
        raise HTTPException(status_code=400, detail="No transactions to export")

    if request.format == "csv":
        output = generate_csv(request.transactions)
        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{request.filename}.csv"'
            },
        )
    elif request.format == "xlsx":
        output = generate_excel(request.transactions)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f'attachment; filename="{request.filename}.xlsx"'
            },
        )
    else:
        raise HTTPException(
            status_code=400, detail=f"Unsupported format: {request.format}"
        )
