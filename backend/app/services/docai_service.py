import io
import logging
import os

from app.config import settings

logger = logging.getLogger(__name__)

# Document AI online processing limit
_DOCAI_MAX_PAGES = 15


async def extract_text_with_docai(file_bytes: bytes, mime_type: str) -> str | None:
    """Send file to Google Document AI for OCR. Returns formatted text or None on failure."""
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

        all_text_parts: list[str] = []
        for chunk in chunks:
            raw_document = documentai.RawDocument(content=chunk, mime_type=mime_type)
            request = documentai.ProcessRequest(
                name=processor_name,
                raw_document=raw_document,
            )
            result = await client.process_document(request=request)
            part = _format_document(result.document)
            if part:
                all_text_parts.append(part)

        if not all_text_parts:
            logger.warning("Document AI returned no text")
            return None

        combined = "\n\n".join(all_text_parts)
        logger.info(f"Document AI extracted {len(combined)} chars from {len(chunks)} chunk(s)")
        return combined

    except Exception:
        logger.exception("Document AI processing failed, falling back to Vision")
        return None


def _format_document(document) -> str:
    """Format Document AI output — prefer table structure, fall back to plain text."""
    if not document:
        return ""

    parts: list[str] = []

    # Extract tables as pipe-delimited markdown
    for page in document.pages:
        for table in page.tables:
            table_text = _format_table(table, document.text)
            if table_text:
                parts.append(table_text)

    if parts:
        # Include any non-table text as context (headers, footers, etc.)
        if document.text:
            parts.insert(0, document.text)
        return "\n\n".join(parts)

    # No tables found — return raw text
    return document.text or ""


def _format_table(table, full_text: str) -> str:
    """Convert a Document AI table to pipe-delimited markdown."""
    rows: list[list[str]] = []

    # Header rows
    if table.header_rows:
        for row in table.header_rows:
            cells = [_get_cell_text(cell, full_text) for cell in row.cells]
            rows.append(cells)

    # Body rows
    if table.body_rows:
        for row in table.body_rows:
            cells = [_get_cell_text(cell, full_text) for cell in row.cells]
            rows.append(cells)

    if not rows:
        return ""

    lines: list[str] = []
    for i, row in enumerate(rows):
        lines.append("| " + " | ".join(row) + " |")
        # Add separator after header
        if i == 0 and table.header_rows:
            lines.append("| " + " | ".join("---" for _ in row) + " |")

    return "\n".join(lines)


def _get_cell_text(cell, full_text: str) -> str:
    """Extract text content from a table cell using text anchors."""
    text = ""
    if cell.layout and cell.layout.text_anchor and cell.layout.text_anchor.text_segments:
        for segment in cell.layout.text_anchor.text_segments:
            start = int(segment.start_index) if segment.start_index else 0
            end = int(segment.end_index) if segment.end_index else 0
            text += full_text[start:end]
    return text.strip().replace("\n", " ")


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
