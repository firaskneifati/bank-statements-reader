"""add actual_pages tracking to organizations

Revision ID: 87c943a5e25b
Revises: f1a2b3c4d5e6
Create Date: 2026-02-12 02:57:26.947542

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '87c943a5e25b'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('organizations', sa.Column('total_actual_pages', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('organizations', sa.Column('month_actual_pages', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('organizations', 'month_actual_pages')
    op.drop_column('organizations', 'total_actual_pages')
