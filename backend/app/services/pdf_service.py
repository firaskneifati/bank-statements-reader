import pdfplumber


def extract_text_from_pdf(file_path: str) -> tuple[str, int]:
    """Extract text from a PDF file. Returns (text, page_count).

    Uses layout-aware extraction to preserve full descriptions and table alignment.
    """
    text_parts: list[str] = []
    with pdfplumber.open(file_path) as pdf:
        page_count = len(pdf.pages)
        for page in pdf.pages:
            # Try table extraction first for structured data
            tables = page.extract_tables()
            if tables:
                for table in tables:
                    for row in table:
                        cells = [cell.strip() if cell else "" for cell in row]
                        text_parts.append(" | ".join(cells))
                # Also get non-table text (headers, footers)
                non_table_text = page.extract_text()
                if non_table_text:
                    text_parts.append(non_table_text)
            else:
                page_text = page.extract_text(layout=True)
                if page_text:
                    text_parts.append(page_text)
    return ("\n\n".join(text_parts), page_count)
