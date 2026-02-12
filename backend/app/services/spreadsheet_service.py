"""Service to extract text tables from CSV and XLSX files for LLM parsing."""

import csv
import logging
from pathlib import Path

import openpyxl

logger = logging.getLogger(__name__)

MAX_ROWS = 500


def extract_text_from_spreadsheet(file_path: str) -> tuple[str, int]:
    """Read a CSV or XLSX file and return a plain-text table + row count.

    Returns:
        (text_table, row_count) — row_count excludes the header row.
    """
    ext = Path(file_path).suffix.lower()

    if ext == ".csv":
        rows = _read_csv(file_path)
    elif ext == ".xlsx":
        rows = _read_xlsx(file_path)
    else:
        raise ValueError(f"Unsupported spreadsheet extension: {ext}")

    if not rows:
        return "", 0

    # First row is the header
    header = rows[0]
    data_rows = rows[1 : MAX_ROWS + 1]

    if len(rows) - 1 > MAX_ROWS:
        logger.warning(
            f"Spreadsheet '{file_path}' has {len(rows) - 1} data rows; capping at {MAX_ROWS}"
        )

    # Build a plain-text table separated by " | "
    lines = [" | ".join(str(cell) for cell in header)]
    lines.append("-" * len(lines[0]))
    for row in data_rows:
        # Pad shorter rows to match header length
        padded = list(row) + [""] * (len(header) - len(row))
        lines.append(" | ".join(str(cell) for cell in padded[: len(header)]))

    return "\n".join(lines), len(data_rows)


def _read_csv(file_path: str) -> list[list[str]]:
    """Read all rows from a CSV file."""
    rows: list[list[str]] = []
    with open(file_path, newline="", encoding="utf-8-sig") as f:
        # Sniff the dialect to handle various delimiters
        sample = f.read(8192)
        f.seek(0)
        try:
            dialect = csv.Sniffer().sniff(sample)
        except csv.Error:
            dialect = csv.excel  # type: ignore[assignment]

        reader = csv.reader(f, dialect)
        for row in reader:
            # Skip completely empty rows
            if any(cell.strip() for cell in row):
                rows.append(row)
    return rows


def _read_xlsx(file_path: str) -> list[list[str]]:
    """Read all rows from the first sheet of an XLSX file."""
    wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
    ws = wb.active
    if ws is None:
        wb.close()
        return []

    rows: list[list[str]] = []
    for row in ws.iter_rows(values_only=True):
        str_row = [str(cell) if cell is not None else "" for cell in row]
        if any(cell.strip() for cell in str_row):
            rows.append(str_row)

    wb.close()
    return rows
