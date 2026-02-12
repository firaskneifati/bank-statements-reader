import json
import logging
import math
import os
import tempfile
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.transaction import StatementResult, UploadResponse, UsageStats
from app.services.pdf_service import extract_text_from_pdf
from app.services.llm_service import parse_transactions, parse_transactions_from_images
from app.services.image_service import (
    SUPPORTED_IMAGE_EXTENSIONS,
    is_scanned_pdf,
    pdf_page_count,
    pdf_pages_to_images,
    convert_heic_to_jpeg,
    optimize_image,
    validate_image,
)
from app.services.docai_service import extract_text_with_docai
from app.services.categorization_service import categorize_transactions
from app.auth.dependencies import CurrentUser
from app.limiter import limiter
from app.db.engine import get_session
from app.db.models import Upload, Organization
from app.services.audit import log_audit

logger = logging.getLogger(__name__)

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf"} | SUPPORTED_IMAGE_EXTENSIONS


def _get_extension(filename: str) -> str:
    return Path(filename).suffix.lower()


def _validate_file(contents: bytes, filename: str) -> None:
    """Validate file type by extension and magic bytes."""
    ext = _get_extension(filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File '{filename}' has unsupported format. Accepted: PDF, JPEG, PNG, HEIC",
        )

    if len(contents) > settings.max_file_size_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File '{filename}' exceeds {settings.max_file_size_mb}MB limit",
        )

    if ext == ".pdf":
        if not contents[:5].startswith(b"%PDF-"):
            raise HTTPException(
                status_code=400,
                detail=f"File '{filename}' is not a valid PDF",
            )
    else:
        validate_image(contents, filename)


async def _process_single_file(
    file: UploadFile,
    custom_categories: list[dict] | None = None,
) -> tuple[StatementResult, int]:
    """Process a single file (PDF or image). Returns (result, bytes_processed)."""
    contents = await file.read()
    bytes_processed = len(contents)
    filename = file.filename or "unknown"

    _validate_file(contents, filename)

    ext = _get_extension(filename)

    if ext == ".pdf":
        return await _process_pdf(contents, filename, custom_categories)
    else:
        return await _process_image(contents, filename, custom_categories)


async def _process_pdf(
    contents: bytes,
    filename: str,
    custom_categories: list[dict] | None,
) -> tuple[StatementResult, int]:
    """Process a PDF — text-based or scanned."""
    bytes_processed = len(contents)

    with tempfile.NamedTemporaryFile(
        suffix=".pdf", dir=settings.upload_dir, delete=False
    ) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    temp_images: list[str] = []
    try:
        text, page_count = extract_text_from_pdf(tmp_path)

        if text.strip() and not is_scanned_pdf(tmp_path):
            # --- Text PDF path ---
            transactions = await parse_transactions(
                text, filename, custom_categories=custom_categories
            )
            if settings.mock_mode:
                transactions = categorize_transactions(transactions)

            effective_pages = page_count
            processing_type = "text"
        else:
            # --- Scanned PDF path ---
            logger.info(f"Scanned PDF detected: '{filename}', {page_count} pages")
            page_count = pdf_page_count(tmp_path)

            # Try Document AI first (cheap OCR)
            docai_text = await extract_text_with_docai(contents, "application/pdf")
            if docai_text:
                logger.info(f"Using Document AI OCR for '{filename}'")
                transactions = await parse_transactions(
                    docai_text, filename, custom_categories=custom_categories
                )
                if settings.mock_mode:
                    transactions = categorize_transactions(transactions)

                effective_pages = page_count
                processing_type = "ocr"
            else:
                # Fall back to Vision path
                logger.info(f"Falling back to Vision for '{filename}'")
                temp_images = pdf_pages_to_images(tmp_path)
                for img_path in temp_images:
                    optimize_image(img_path)

                transactions = await parse_transactions_from_images(
                    temp_images, filename, custom_categories=custom_categories
                )
                if settings.mock_mode:
                    transactions = categorize_transactions(transactions)

                effective_pages = math.ceil(page_count * settings.image_page_cost_multiplier)
                processing_type = "image"

        total_debits = sum(t.amount for t in transactions if t.type == "debit")
        total_credits = sum(t.amount for t in transactions if t.type == "credit")

        result = StatementResult(
            filename=filename,
            transactions=transactions,
            total_debits=round(total_debits, 2),
            total_credits=round(total_credits, 2),
            transaction_count=len(transactions),
            page_count=effective_pages,
            actual_pages=page_count,
            processing_type=processing_type,
        )
        return (result, bytes_processed)
    finally:
        os.unlink(tmp_path)
        for img_path in temp_images:
            try:
                os.unlink(img_path)
            except OSError:
                pass


async def _process_image(
    contents: bytes,
    filename: str,
    custom_categories: list[dict] | None,
) -> tuple[StatementResult, int]:
    """Process an image file (JPEG, PNG, HEIC)."""
    bytes_processed = len(contents)
    ext = _get_extension(filename)

    with tempfile.NamedTemporaryFile(
        suffix=ext, dir=settings.upload_dir, delete=False
    ) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    temp_files: list[str] = [tmp_path]
    try:
        # Convert HEIC to JPEG (required for both Document AI and Vision)
        if ext == ".heic":
            jpeg_path = convert_heic_to_jpeg(tmp_path)
            temp_files.append(jpeg_path)
            img_path = jpeg_path
            docai_mime = "image/jpeg"
        else:
            img_path = tmp_path
            docai_mime = "image/jpeg" if ext in (".jpg", ".jpeg") else "image/png"

        # Enhance image for better OCR (grayscale + contrast boost)
        optimize_image(img_path)

        # Try Document AI first
        with open(img_path, "rb") as f:
            img_bytes = f.read()
        docai_text = await extract_text_with_docai(img_bytes, docai_mime)

        if docai_text:
            logger.info(f"Using Document AI OCR for image '{filename}'")
            transactions = await parse_transactions(
                docai_text, filename, custom_categories=custom_categories
            )
            if settings.mock_mode:
                transactions = categorize_transactions(transactions)

            effective_pages = 1
            processing_type = "ocr"
        else:
            # Fall back to Vision path (image already optimized above)
            transactions = await parse_transactions_from_images(
                [img_path], filename, custom_categories=custom_categories
            )
            if settings.mock_mode:
                transactions = categorize_transactions(transactions)

            effective_pages = math.ceil(1 * settings.image_page_cost_multiplier)
            processing_type = "image"

        total_debits = sum(t.amount for t in transactions if t.type == "debit")
        total_credits = sum(t.amount for t in transactions if t.type == "credit")

        result = StatementResult(
            filename=filename,
            transactions=transactions,
            total_debits=round(total_debits, 2),
            total_credits=round(total_credits, 2),
            transaction_count=len(transactions),
            page_count=effective_pages,
            actual_pages=1,
            processing_type=processing_type,
        )
        return (result, bytes_processed)
    finally:
        for f in temp_files:
            try:
                os.unlink(f)
            except OSError:
                pass


def _usage_from_org(org: Organization) -> UsageStats:
    return UsageStats(
        total_uploads=org.total_uploads,
        total_documents=org.total_documents,
        total_pages=org.total_pages,
        total_actual_pages=org.total_actual_pages,
        total_text_pages=org.total_text_pages,
        total_image_pages=org.total_image_pages,
        total_transactions=org.total_transactions,
        total_exports=org.total_exports,
        total_bytes_processed=org.total_bytes_processed,
        month_uploads=org.month_uploads,
        month_documents=org.month_documents,
        month_pages=org.month_pages,
        month_actual_pages=org.month_actual_pages,
        month_text_pages=org.month_text_pages,
        month_image_pages=org.month_image_pages,
        month_transactions=org.month_transactions,
        month_exports=org.month_exports,
        month_bytes_processed=org.month_bytes_processed,
        page_limit=org.page_limit,
        plan=org.plan,
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

    # Enforce monthly page limit (pre-check)
    org = await session.get(Organization, current_user.org_id)
    if org and org.page_limit is not None and org.month_pages >= org.page_limit:
        raise HTTPException(
            status_code=403,
            detail=f"You've used all {org.month_pages} of your {org.page_limit} monthly page limit. Upgrade your plan for more pages.",
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
    total_actual_pages = sum(s.actual_pages for s in statements)
    total_text_pages = sum(s.actual_pages for s in statements if s.processing_type in ("text", "ocr"))
    total_image_pages = sum(s.actual_pages for s in statements if s.processing_type == "image")

    # Enforce monthly page limit (post-check: reject if this upload would exceed the limit)
    if org and org.page_limit is not None and org.month_pages + total_pages > org.page_limit:
        remaining = max(0, org.page_limit - org.month_pages)
        raise HTTPException(
            status_code=403,
            detail=f"This upload has {total_pages} pages but you only have {remaining} of your {org.page_limit} monthly page limit remaining. Upgrade your plan or try uploading fewer files.",
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
            org.total_actual_pages += total_actual_pages
            org.total_text_pages += total_text_pages
            org.total_image_pages += total_image_pages
            org.total_transactions += total_txns
            org.total_bytes_processed += total_bytes
            org.month_uploads += 1
            org.month_documents += doc_count
            org.month_pages += total_pages
            org.month_actual_pages += total_actual_pages
            org.month_text_pages += total_text_pages
            org.month_image_pages += total_image_pages
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
