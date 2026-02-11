import asyncio
import json
import logging
import os
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.transaction import StatementResult, UploadResponse, UsageStats
from app.services.pdf_service import extract_text_from_pdf
from app.services.llm_service import parse_transactions
from app.services.categorization_service import categorize_transactions
from app.auth.dependencies import CurrentUser
from app.limiter import limiter
from app.db.engine import get_session
from app.db.models import Upload, Organization
from app.services.audit import log_audit

logger = logging.getLogger(__name__)

router = APIRouter()


async def _process_single_file(
    file: UploadFile,
    custom_categories: list[dict] | None = None,
) -> tuple[StatementResult, int]:
    """Process a single PDF. Returns (result, bytes_processed)."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail=f"File '{file.filename}' is not a PDF",
        )

    contents = await file.read()
    bytes_processed = len(contents)

    if not contents[:5].startswith(b"%PDF-"):
        raise HTTPException(
            status_code=400,
            detail=f"File '{file.filename}' is not a valid PDF",
        )

    if bytes_processed > settings.max_file_size_bytes:
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
        text, page_count = extract_text_from_pdf(tmp_path)
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

        result = StatementResult(
            filename=file.filename or "unknown.pdf",
            transactions=transactions,
            total_debits=round(total_debits, 2),
            total_credits=round(total_credits, 2),
            transaction_count=len(transactions),
            page_count=page_count,
        )
        return (result, bytes_processed)
    finally:
        os.unlink(tmp_path)


def _usage_from_org(org: Organization) -> UsageStats:
    return UsageStats(
        total_uploads=org.total_uploads,
        total_documents=org.total_documents,
        total_pages=org.total_pages,
        total_transactions=org.total_transactions,
        total_exports=org.total_exports,
        total_bytes_processed=org.total_bytes_processed,
        month_uploads=org.month_uploads,
        month_documents=org.month_documents,
        month_pages=org.month_pages,
        month_transactions=org.month_transactions,
        month_exports=org.month_exports,
        month_bytes_processed=org.month_bytes_processed,
        page_limit=org.page_limit,
    )


@router.post("/upload", response_model=UploadResponse)
@limiter.limit("10/minute")
async def upload_statements(
    request: Request,
    current_user: CurrentUser,
    files: list[UploadFile] = File(...),
    categories: str = Form(None),
    session: AsyncSession = Depends(get_session),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    # Enforce page limit (pre-check)
    org = await session.get(Organization, current_user.org_id)
    if org and org.page_limit is not None and org.total_pages >= org.page_limit:
        raise HTTPException(
            status_code=403,
            detail=f"You've used all {org.total_pages} of your {org.page_limit} page limit. Please contact support to increase your limit.",
        )

    custom_categories: list[dict] | None = None
    if categories:
        try:
            custom_categories = json.loads(categories)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid categories JSON")

    # Process files sequentially to avoid Claude API rate limits
    results = []
    for f in files:
        results.append(await _process_single_file(f, custom_categories=custom_categories))

    statements = [r[0] for r in results]
    total_bytes = sum(r[1] for r in results)
    total_pages = sum(s.page_count for s in statements)

    # Enforce page limit (post-check: reject if this upload would exceed the limit)
    if org and org.page_limit is not None and org.total_pages + total_pages > org.page_limit:
        remaining = max(0, org.page_limit - org.total_pages)
        raise HTTPException(
            status_code=403,
            detail=f"This upload has {total_pages} pages but you only have {remaining} of your {org.page_limit} page limit remaining. Try uploading fewer files.",
        )
    total_txns = sum(s.transaction_count for s in statements)
    doc_count = len(statements)

    # Record usage in DB
    usage: UsageStats | None = None
    try:
        upload_record = Upload(
            org_id=current_user.org_id,
            uploaded_by_user_id=current_user.id,
            status="completed",
            document_count=doc_count,
            page_count=total_pages,
            transaction_count=total_txns,
            bytes_processed=total_bytes,
        )
        session.add(upload_record)

        org = await session.get(Organization, current_user.org_id)
        if org:
            org.total_uploads += 1
            org.total_documents += doc_count
            org.total_pages += total_pages
            org.total_transactions += total_txns
            org.total_bytes_processed += total_bytes
            org.month_uploads += 1
            org.month_documents += doc_count
            org.month_pages += total_pages
            org.month_transactions += total_txns
            org.month_bytes_processed += total_bytes
            session.add(org)

        await session.commit()

        if org:
            await session.refresh(org)
            usage = _usage_from_org(org)
        await log_audit(
            session, "upload", request,
            user_id=current_user.id, org_id=current_user.org_id,
            detail=f"{doc_count} files, {total_pages} pages, {total_txns} transactions",
        )
    except Exception:
        logger.exception("Failed to record upload usage — user still gets results")
        await session.rollback()

    return UploadResponse(
        statements=statements,
        mock_mode=settings.mock_mode,
        usage=usage,
    )
