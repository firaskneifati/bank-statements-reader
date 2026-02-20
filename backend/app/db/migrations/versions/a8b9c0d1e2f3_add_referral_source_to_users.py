"""add referral_source to users

Revision ID: a8b9c0d1e2f3
Revises: 244074960ce8
Create Date: 2026-02-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "a8b9c0d1e2f3"
down_revision: Union[str, None] = "244074960ce8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("referral_source", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "referral_source")
