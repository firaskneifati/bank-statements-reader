import base64
import logging
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image, ImageEnhance

from app.config import settings

logger = logging.getLogger(__name__)

SUPPORTED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".heic"}
SUPPORTED_MIME_TYPES = {"image/jpeg", "image/png", "image/heic"}

# Magic bytes for image format detection
MAGIC_BYTES = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"%PDF-": "application/pdf",
}


def detect_mime_from_bytes(data: bytes) -> str | None:
    for magic, mime in MAGIC_BYTES.items():
        if data[: len(magic)] == magic:
            return mime
    # HEIC files start with ftyp box — check for 'ftyp' at offset 4
    if len(data) >= 12 and data[4:8] == b"ftyp":
        return "image/heic"
    return None


def is_scanned_pdf(path: str) -> bool:
    """Check if a PDF has less than 50 chars of extractable text (likely scanned)."""
    import pdfplumber

    with pdfplumber.open(path) as pdf:
        total_text = ""
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            total_text += page_text
            if len(total_text) >= 50:
                return False
    return True


def pdf_page_count(path: str) -> int:
    """Return the number of pages in a PDF."""
    doc = fitz.open(path)
    count = len(doc)
    doc.close()
    return count


def pdf_pages_to_images(path: str) -> list[str]:
    """Convert each page of a PDF to a PNG image. Returns list of temp file paths."""
    import tempfile

    doc = fitz.open(path)
    image_paths = []
    for i, page in enumerate(doc):
        # Render at 2x for better OCR quality
        mat = fitz.Matrix(2.0, 2.0)
        pix = page.get_pixmap(matrix=mat)
        tmp = tempfile.NamedTemporaryFile(
            suffix=".png", dir=settings.upload_dir, delete=False
        )
        pix.save(tmp.name)
        image_paths.append(tmp.name)
        tmp.close()
    doc.close()
    return image_paths


def convert_heic_to_jpeg(path: str) -> str:
    """Convert HEIC image to JPEG. Returns path to the new JPEG file."""
    import tempfile

    from pillow_heif import register_heif_opener

    register_heif_opener()

    img = Image.open(path)
    tmp = tempfile.NamedTemporaryFile(
        suffix=".jpg", dir=settings.upload_dir, delete=False
    )
    img.convert("RGB").save(tmp.name, "JPEG", quality=90)
    tmp.close()
    img.close()
    return tmp.name


def optimize_image(path: str, max_dim: int | None = None) -> str:
    """Resize, convert to grayscale, and enhance contrast for better OCR. Modifies in place."""
    if max_dim is None:
        max_dim = settings.max_image_dimension

    img = Image.open(path)
    w, h = img.size
    if w > max_dim or h > max_dim:
        ratio = min(max_dim / w, max_dim / h)
        new_size = (int(w * ratio), int(h * ratio))
        img = img.resize(new_size, Image.LANCZOS)

    # Convert to grayscale and boost contrast for cleaner text recognition
    img = img.convert("L")
    img = ImageEnhance.Contrast(img).enhance(1.5)
    img = img.convert("RGB")

    img.save(path)
    img.close()
    return path


def image_to_base64(path: str) -> tuple[str, str]:
    """Read an image file and return (base64_data, media_type)."""
    ext = Path(path).suffix.lower()
    media_type_map = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
    }
    media_type = media_type_map.get(ext, "image/png")

    with open(path, "rb") as f:
        data = base64.standard_b64encode(f.read()).decode("utf-8")
    return (data, media_type)


def validate_image(data: bytes, filename: str) -> None:
    """Validate image format and integrity. Raises HTTPException on failure."""
    from fastapi import HTTPException

    ext = Path(filename).suffix.lower()
    if ext not in SUPPORTED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image format '{ext}'. Supported: JPEG, PNG, HEIC",
        )

    detected = detect_mime_from_bytes(data)
    if detected is None:
        raise HTTPException(
            status_code=400,
            detail=f"File '{filename}' does not appear to be a valid image",
        )

    # Verify the detected type matches the extension
    ext_to_mime = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".heic": "image/heic",
    }
    expected = ext_to_mime.get(ext)
    if expected and detected != expected:
        raise HTTPException(
            status_code=400,
            detail=f"File '{filename}' extension doesn't match its content type",
        )
