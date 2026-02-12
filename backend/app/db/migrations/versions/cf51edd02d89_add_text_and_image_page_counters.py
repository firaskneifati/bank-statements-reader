"""add text and image page counters

Revision ID: cf51edd02d89
Revises: 87c943a5e25b
Create Date: 2026-02-12 03:08:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'cf51edd02d89'
down_revision: Union[str, None] = '87c943a5e25b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('organizations', sa.Column('total_text_pages', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('organizations', sa.Column('total_image_pages', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('organizations', sa.Column('month_text_pages', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('organizations', sa.Column('month_image_pages', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('organizations', 'month_image_pages')
    op.drop_column('organizations', 'month_text_pages')
    op.drop_column('organizations', 'total_image_pages')
    op.drop_column('organizations', 'total_text_pages')
