import uuid
from datetime import date, datetime

from sqlmodel import Field, SQLModel, Relationship


# ── helpers ──────────────────────────────────────────────────────────
def _uuid() -> uuid.UUID:
    return uuid.uuid4()


def _now() -> datetime:
    return datetime.utcnow()


# ── Organization ─────────────────────────────────────────────────────
class Organization(SQLModel, table=True):
    __tablename__ = "organizations"

    id: uuid.UUID = Field(default_factory=_uuid, primary_key=True)
    name: str
    clerk_org_id: str | None = Field(default=None, unique=True)
    stripe_customer_id: str | None = None
    stripe_subscription_id: str | None = None
    plan: str = Field(default="free")
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)

    users: list["User"] = Relationship(back_populates="organization")
    clients: list["Client"] = Relationship(back_populates="organization")
    uploads: list["Upload"] = Relationship(back_populates="organization")
    transactions: list["TransactionRecord"] = Relationship(back_populates="organization")
    category_templates: list["CategoryTemplate"] = Relationship(back_populates="organization")


# ── User ─────────────────────────────────────────────────────────────
class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=_uuid, primary_key=True)
    clerk_user_id: str = Field(unique=True)
    email: str
    full_name: str = ""
    role: str = Field(default="member")
    org_id: uuid.UUID = Field(foreign_key="organizations.id", index=True)
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)

    organization: Organization = Relationship(back_populates="users")


# ── Client ───────────────────────────────────────────────────────────
class Client(SQLModel, table=True):
    __tablename__ = "clients"

    id: uuid.UUID = Field(default_factory=_uuid, primary_key=True)
    org_id: uuid.UUID = Field(foreign_key="organizations.id", index=True)
    name: str
    email: str | None = None
    clerk_user_id: str | None = None
    phone: str | None = None
    notes: str | None = None
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)

    organization: Organization = Relationship(back_populates="clients")
    uploads: list["Upload"] = Relationship(back_populates="client")
    transactions: list["TransactionRecord"] = Relationship(back_populates="client")


# ── Upload ───────────────────────────────────────────────────────────
class Upload(SQLModel, table=True):
    __tablename__ = "uploads"

    id: uuid.UUID = Field(default_factory=_uuid, primary_key=True)
    org_id: uuid.UUID = Field(foreign_key="organizations.id", index=True)
    client_id: uuid.UUID | None = Field(default=None, foreign_key="clients.id")
    uploaded_by_user_id: uuid.UUID | None = Field(default=None, foreign_key="users.id")
    filename: str
    status: str = Field(default="processing")
    transaction_count: int = Field(default=0)
    total_debits: float = Field(default=0)
    total_credits: float = Field(default=0)
    created_at: datetime = Field(default_factory=_now)

    organization: Organization = Relationship(back_populates="uploads")
    client: Client | None = Relationship(back_populates="uploads")
    transactions: list["TransactionRecord"] = Relationship(back_populates="upload")


# ── TransactionRecord ────────────────────────────────────────────────
class TransactionRecord(SQLModel, table=True):
    __tablename__ = "transaction_records"

    id: uuid.UUID = Field(default_factory=_uuid, primary_key=True)
    org_id: uuid.UUID = Field(foreign_key="organizations.id", index=True)
    upload_id: uuid.UUID = Field(foreign_key="uploads.id", index=True)
    client_id: uuid.UUID | None = Field(default=None, foreign_key="clients.id")
    date: date
    posting_date: date | None = None
    description: str
    amount: float
    type: str
    balance: float | None = None
    category: str = Field(default="Other")
    created_at: datetime = Field(default_factory=_now)

    organization: Organization = Relationship(back_populates="transactions")
    upload: Upload = Relationship(back_populates="transactions")
    client: Client | None = Relationship(back_populates="transactions")


# ── CategoryTemplate ─────────────────────────────────────────────────
class CategoryTemplate(SQLModel, table=True):
    __tablename__ = "category_templates"

    id: uuid.UUID = Field(default_factory=_uuid, primary_key=True)
    org_id: uuid.UUID = Field(foreign_key="organizations.id", index=True)
    name: str
    description: str | None = None
    sort_order: int = Field(default=0)
    created_at: datetime = Field(default_factory=_now)

    organization: Organization = Relationship(back_populates="category_templates")
