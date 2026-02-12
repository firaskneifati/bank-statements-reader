from pydantic import BaseModel


class Transaction(BaseModel):
    date: str
    posting_date: str | None = None
    description: str
    amount: float
    type: str  # "debit" or "credit"
    balance: float | None = None
    category: str = "Other"


class StatementResult(BaseModel):
    filename: str
    transactions: list[Transaction]
    total_debits: float
    total_credits: float
    transaction_count: int
    page_count: int = 0         # credits (with multiplier)
    actual_pages: int = 0       # real document pages
    processing_type: str = "text"
    ocr_confidence: float | None = None  # Document AI confidence (0.0–1.0)


class UsageStats(BaseModel):
    total_uploads: int
    total_documents: int
    total_pages: int
    total_actual_pages: int = 0
    total_text_pages: int = 0
    total_image_pages: int = 0
    total_transactions: int
    total_exports: int
    total_bytes_processed: int
    month_uploads: int
    month_documents: int
    month_pages: int
    month_actual_pages: int = 0
    month_text_pages: int = 0
    month_image_pages: int = 0
    month_transactions: int
    month_exports: int
    month_bytes_processed: int
    page_limit: int | None = None
    bonus_pages: int = 0
    plan: str = "free"


class UploadResponse(BaseModel):
    statements: list[StatementResult]
    mock_mode: bool
    usage: UsageStats | None = None


class ExportRequest(BaseModel):
    transactions: list[Transaction]
    format: str = "csv"  # "csv" or "xlsx"
    filename: str = "transactions"
