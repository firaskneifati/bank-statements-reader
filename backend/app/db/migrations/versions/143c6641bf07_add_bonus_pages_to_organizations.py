"""add bonus_pages to organizations

Revision ID: 143c6641bf07
Revises: cf51edd02d89
Create Date: 2026-02-12 15:41:29.282349

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '143c6641bf07'
down_revision: Union[str, None] = 'cf51edd02d89'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('organizations', sa.Column('bonus_pages', sa.Integer(), server_default='0', nullable=False))


def downgrade() -> None:
    op.drop_column('organizations', 'bonus_pages')
