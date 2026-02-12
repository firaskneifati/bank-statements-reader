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
    page_count: int = 0
    processing_type: str = "text"


class UsageStats(BaseModel):
    total_uploads: int
    total_documents: int
    total_pages: int
    total_transactions: int
    total_exports: int
    total_bytes_processed: int
    month_uploads: int
    month_documents: int
    month_pages: int
    month_transactions: int
    month_exports: int
    month_bytes_processed: int
    page_limit: int | None = None
    plan: str = "free"


class UploadResponse(BaseModel):
    statements: list[StatementResult]
    mock_mode: bool
    usage: UsageStats | None = None


class ExportRequest(BaseModel):
    transactions: list[Transaction]
    format: str = "csv"  # "csv" or "xlsx"
    filename: str = "transactions"
