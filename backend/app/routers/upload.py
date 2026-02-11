import asyncio
import json
import os
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app.config import settings
from app.models.transaction import StatementResult, UploadResponse
from app.services.pdf_service import extract_text_from_pdf
from app.services.llm_service import parse_transactions
from app.services.categorization_service import categorize_transactions
from app.auth.dependencies import CurrentUser

router = APIRouter()


async def _process_single_file(
    file: UploadFile,
    custom_categories: list[dict] | None = None,
) -> StatementResult:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail=f"File '{file.filename}' is not a PDF",
        )

    contents = await file.read()
    if len(contents) > settings.max_file_size_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File '{file.filename}' exceeds {settings.max_file_size_mb}MB limit",
        )

    with tempfile.NamedTemporaryFile(
        suffix=".pdf", dir=settings.upload_dir, delete=False
    ) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        text = extract_text_from_pdf(tmp_path)
        if not text.strip():
            raise HTTPException(
                status_code=422,
                detail=f"Could not extract text from '{file.filename}'. The PDF may be scanned/image-based.",
            )

        transactions = await parse_transactions(text, file.filename or "unknown.pdf", custom_categories=custom_categories)
        # In mock mode, use keyword categorization as fallback
        # In real mode, Claude already categorizes during parsing
        if settings.mock_mode:
            transactions = categorize_transactions(transactions)

        total_debits = sum(t.amount for t in transactions if t.type == "debit")
        total_credits = sum(t.amount for t in transactions if t.type == "credit")

        return StatementResult(
            filename=file.filename or "unknown.pdf",
            transactions=transactions,
            total_debits=round(total_debits, 2),
            total_credits=round(total_credits, 2),
            transaction_count=len(transactions),
        )
    finally:
        os.unlink(tmp_path)


@router.post("/upload", response_model=UploadResponse)
async def upload_statements(
    current_user: CurrentUser,
    files: list[UploadFile] = File(...),
    categories: str = Form(None),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    custom_categories: list[dict] | None = None
    if categories:
        try:
            custom_categories = json.loads(categories)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid categories JSON")

    # Process all files concurrently for speed
    statements = await asyncio.gather(
        *[_process_single_file(f, custom_categories=custom_categories) for f in files]
    )

    return UploadResponse(statements=list(statements), mock_mode=settings.mock_mode)
