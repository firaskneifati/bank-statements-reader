"""add page_limit to organizations

Revision ID: 0120935ce9e0
Revises: e5f6a7b8c9d0
Create Date: 2026-02-11 14:13:52.792581

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '0120935ce9e0'
down_revision: Union[str, None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('organizations', sa.Column('page_limit', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('organizations', 'page_limit')
