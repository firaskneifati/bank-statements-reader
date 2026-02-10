import csv
import io

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, numbers

from app.models.transaction import Transaction

HEADERS = ["Date", "Posting Date", "Description", "Amount", "Type", "Balance", "Category"]


def generate_csv(transactions: list[Transaction]) -> io.StringIO:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(HEADERS)
    for tx in transactions:
        writer.writerow([
            tx.date,
            tx.posting_date or "",
            tx.description,
            f"{tx.amount:.2f}",
            tx.type,
            f"{tx.balance:.2f}" if tx.balance is not None else "",
            tx.category,
        ])
    output.seek(0)
    return output


def generate_excel(transactions: list[Transaction]) -> io.BytesIO:
    wb = Workbook()
    ws = wb.active
    ws.title = "Transactions"

    # Header styling
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")

    for col_idx, header in enumerate(HEADERS, 1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")

    # Data rows
    debit_fill = PatternFill(start_color="FFF2F2", end_color="FFF2F2", fill_type="solid")
    credit_fill = PatternFill(start_color="F2FFF2", end_color="F2FFF2", fill_type="solid")

    for row_idx, tx in enumerate(transactions, 2):
        fill = credit_fill if tx.type == "credit" else debit_fill

        ws.cell(row=row_idx, column=1, value=tx.date).fill = fill
        ws.cell(row=row_idx, column=2, value=tx.posting_date or "").fill = fill
        ws.cell(row=row_idx, column=3, value=tx.description).fill = fill

        amount_cell = ws.cell(row=row_idx, column=4, value=tx.amount)
        amount_cell.number_format = numbers.FORMAT_NUMBER_COMMA_SEPARATED1
        amount_cell.fill = fill

        ws.cell(row=row_idx, column=5, value=tx.type).fill = fill

        if tx.balance is not None:
            balance_cell = ws.cell(row=row_idx, column=6, value=tx.balance)
            balance_cell.number_format = numbers.FORMAT_NUMBER_COMMA_SEPARATED1
            balance_cell.fill = fill
        else:
            ws.cell(row=row_idx, column=6, value="").fill = fill

        ws.cell(row=row_idx, column=7, value=tx.category).fill = fill

    # Auto-fit column widths
    for col in ws.columns:
        max_length = 0
        col_letter = col[0].column_letter
        for cell in col:
            if cell.value:
                max_length = max(max_length, len(str(cell.value)))
        ws.column_dimensions[col_letter].width = min(max_length + 3, 40)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output
