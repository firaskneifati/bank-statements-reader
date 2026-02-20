import uuid
from datetime import datetime

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
    stripe_customer_id: str | None = None
    stripe_subscription_id: str | None = None
    stripe_price_id: str | None = None
    plan: str = Field(default="free")
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)

    # Lifetime totals
    total_uploads: int = Field(default=0)
    total_documents: int = Field(default=0)
    total_pages: int = Field(default=0)          # credits (with multiplier)
    total_actual_pages: int = Field(default=0)   # real document pages
    total_text_pages: int = Field(default=0)
    total_image_pages: int = Field(default=0)
    total_transactions: int = Field(default=0)
    total_exports: int = Field(default=0)
    total_bytes_processed: int = Field(default=0)

    # Limits (None = unlimited)
    page_limit: int | None = Field(default=None)
    bonus_pages: int = Field(default=0)

    # Current billing period (reset monthly)
    month_uploads: int = Field(default=0)
    month_documents: int = Field(default=0)
    month_pages: int = Field(default=0)          # credits (with multiplier)
    month_actual_pages: int = Field(default=0)   # real document pages
    month_text_pages: int = Field(default=0)
    month_image_pages: int = Field(default=0)
    month_transactions: int = Field(default=0)
    month_exports: int = Field(default=0)
    month_bytes_processed: int = Field(default=0)
    usage_reset_at: datetime = Field(default_factory=_now)

    users: list["User"] = Relationship(back_populates="organization")
    clients: list["Client"] = Relationship(back_populates="organization")
    uploads: list["Upload"] = Relationship(back_populates="organization")
    export_logs: list["ExportLog"] = Relationship(back_populates="organization")


# ── User ─────────────────────────────────────────────────────────────
class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=_uuid, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str | None = None
    auth_provider: str = Field(default="credentials")
    full_name: str = ""
    role: str = Field(default="member")
    org_id: uuid.UUID = Field(foreign_key="organizations.id", index=True)
    totp_secret: str | None = None
    totp_enabled: bool = Field(default=False)
    referral_source: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)

    organization: Organization = Relationship(back_populates="users")
    uploads: list["Upload"] = Relationship(back_populates="uploaded_by")
    export_logs: list["ExportLog"] = Relationship(back_populates="user")
    category_groups: list["CategoryGroup"] = Relationship(back_populates="user")


# ── Client ───────────────────────────────────────────────────────────
class Client(SQLModel, table=True):
    __tablename__ = "clients"

    id: uuid.UUID = Field(default_factory=_uuid, primary_key=True)
    org_id: uuid.UUID = Field(foreign_key="organizations.id", index=True)
    name: str
    email: str | None = None
    phone: str | None = None
    notes: str | None = None
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)

    organization: Organization = Relationship(back_populates="clients")


# ── Upload (usage metadata log) ─────────────────────────────────────
class Upload(SQLModel, table=True):
    __tablename__ = "uploads"

    id: uuid.UUID = Field(default_factory=_uuid, primary_key=True)
    org_id: uuid.UUID = Field(foreign_key="organizations.id", index=True)
    uploaded_by_user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    status: str = Field(default="processing")
    document_count: int = Field(default=0)
    page_count: int = Field(default=0)
    transaction_count: int = Field(default=0)
    bytes_processed: int = Field(default=0)
    created_at: datetime = Field(default_factory=_now)

    organization: Organization = Relationship(back_populates="uploads")
    uploaded_by: User = Relationship(back_populates="uploads")


# ── ExportLog ────────────────────────────────────────────────────────
class ExportLog(SQLModel, table=True):
    __tablename__ = "export_logs"

    id: uuid.UUID = Field(default_factory=_uuid, primary_key=True)
    org_id: uuid.UUID = Field(foreign_key="organizations.id", index=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    format: str
    transaction_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=_now)

    organization: Organization = Relationship(back_populates="export_logs")
    user: User = Relationship(back_populates="export_logs")


# ── CategoryGroup ────────────────────────────────────────────────────
class CategoryGroup(SQLModel, table=True):
    __tablename__ = "category_groups"

    id: uuid.UUID = Field(default_factory=_uuid, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    name: str
    is_active: bool = Field(default=False)
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)

    user: User = Relationship(back_populates="category_groups")
    categories: list["Category"] = Relationship(
        back_populates="group",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


# ── Category ────────────────────────────────────────────────────────
class Category(SQLModel, table=True):
    __tablename__ = "categories"

    id: uuid.UUID = Field(default_factory=_uuid, primary_key=True)
    group_id: uuid.UUID = Field(foreign_key="category_groups.id", index=True)
    name: str
    description: str | None = None
    sort_order: int = Field(default=0)
    created_at: datetime = Field(default_factory=_now)

    group: CategoryGroup = Relationship(back_populates="categories")
    rules: list["CategoryRule"] = Relationship(
        back_populates="category",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


# ── CategoryRule ────────────────────────────────────────────────────
class CategoryRule(SQLModel, table=True):
    __tablename__ = "category_rules"

    id: uuid.UUID = Field(default_factory=_uuid, primary_key=True)
    category_id: uuid.UUID = Field(foreign_key="categories.id", index=True)
    rule_type: str  # "include" or "exclude"
    pattern: str
    created_at: datetime = Field(default_factory=_now)

    category: Category = Relationship(back_populates="rules")


# ── AuditLog ────────────────────────────────────────────────────────
class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_logs"

    id: uuid.UUID = Field(default_factory=_uuid, primary_key=True)
    org_id: uuid.UUID | None = Field(default=None, foreign_key="organizations.id", index=True)
    user_id: uuid.UUID | None = Field(default=None, foreign_key="users.id", index=True)
    action: str = Field(index=True)
    detail: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: datetime = Field(default_factory=_now, index=True)


# ── RevokedToken (JWT blocklist) ───────────────────────────────────
class RevokedToken(SQLModel, table=True):
    __tablename__ = "revoked_tokens"

    id: uuid.UUID = Field(default_factory=_uuid, primary_key=True)
    jti: str = Field(unique=True, index=True)
    expires_at: datetime
    created_at: datetime = Field(default_factory=_now)
