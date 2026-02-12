import io
import logging
import os

from app.config import settings

logger = logging.getLogger(__name__)

# Document AI online processing limit
_DOCAI_MAX_PAGES = 15


async def extract_text_with_docai(file_bytes: bytes, mime_type: str) -> tuple[str, float] | None:
    """Send file to Google Document AI for OCR. Returns (text, confidence) or None on failure."""
    if not settings.docai_enabled:
        return None

    try:
        from google.cloud import documentai_v1 as documentai
    except ImportError:
        logger.warning("google-cloud-documentai not installed, skipping Document AI")
        return None

    # Set credentials env var if configured
    if settings.google_application_credentials:
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = settings.google_application_credentials

    try:
        client = documentai.DocumentProcessorServiceAsyncClient()
        processor_name = client.processor_path(
            settings.google_docai_project_id,
            settings.google_docai_location,
            settings.google_docai_processor_id,
        )

        # Split large PDFs into chunks
        if mime_type == "application/pdf":
            chunks = _split_pdf_bytes(file_bytes)
        else:
            chunks = [file_bytes]

        # OCR config: enable native PDF text layer + language hints
        process_options = documentai.ProcessOptions(
            ocr_config=documentai.OcrConfig(
                enable_native_pdf_parsing=True,
                language_code="en",
            ),
        )

        all_text_parts: list[str] = []
        all_page_confidences: list[float] = []
        for chunk in chunks:
            raw_document = documentai.RawDocument(content=chunk, mime_type=mime_type)
            request = documentai.ProcessRequest(
                name=processor_name,
                raw_document=raw_document,
                process_options=process_options,
            )
            result = await client.process_document(request=request)
            part = _format_document(result.document)
            if part:
                all_text_parts.append(part)
            # Collect per-page confidence scores
            if result.document and result.document.pages:
                for page in result.document.pages:
                    if page.confidence is not None:
                        all_page_confidences.append(page.confidence)

        if not all_text_parts:
            logger.warning("Document AI returned no text")
            return None

        combined = "\n\n".join(all_text_parts)
        # If OCR extracted very little text, the document is likely unreadable
        stripped = combined.strip()
        if len(stripped) < 50:
            logger.warning(f"Document AI returned only {len(stripped)} chars — likely unreadable")
            return None

        avg_confidence = sum(all_page_confidences) / len(all_page_confidences) if all_page_confidences else 0.0
        logger.info(f"Document AI extracted {len(combined)} chars from {len(chunks)} chunk(s), confidence: {avg_confidence:.2%}")
        return (combined, avg_confidence)

    except Exception:
        logger.exception("Document AI processing failed, falling back to Vision")
        return None


def _format_document(document) -> str:
    """Return the full OCR text from Document AI — preserves all content in reading order."""
    if not document:
        return ""
    return document.text or ""


def _split_pdf_bytes(pdf_bytes: bytes) -> list[bytes]:
    """Split a PDF into chunks of at most _DOCAI_MAX_PAGES pages."""
    import fitz  # PyMuPDF

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    total = len(doc)

    if total <= _DOCAI_MAX_PAGES:
        doc.close()
        return [pdf_bytes]

    chunks: list[bytes] = []
    for start in range(0, total, _DOCAI_MAX_PAGES):
        end = min(start + _DOCAI_MAX_PAGES, total)
        chunk_doc = fitz.open()
        chunk_doc.insert_pdf(doc, from_page=start, to_page=end - 1)
        buf = io.BytesIO()
        chunk_doc.save(buf)
        chunks.append(buf.getvalue())
        chunk_doc.close()

    doc.close()
    logger.info(f"Split {total}-page PDF into {len(chunks)} chunks for Document AI")
    return chunks
