import pdfplumber


def extract_text_from_pdf(file_path: str) -> tuple[str, int]:
    """Extract text from a PDF file. Returns (text, page_count)."""
    text_parts: list[str] = []
    with pdfplumber.open(file_path) as pdf:
        page_count = len(pdf.pages)
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return ("\n\n".join(text_parts), page_count)
