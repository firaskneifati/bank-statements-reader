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


class UploadResponse(BaseModel):
    statements: list[StatementResult]
    mock_mode: bool


class ExportRequest(BaseModel):
    transactions: list[Transaction]
    format: str = "csv"  # "csv" or "xlsx"
    filename: str = "transactions"
