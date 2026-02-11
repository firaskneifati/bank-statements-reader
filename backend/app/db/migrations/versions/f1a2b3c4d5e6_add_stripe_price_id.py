"""add stripe_price_id to organizations

Revision ID: f1a2b3c4d5e6
Revises: 0120935ce9e0
Create Date: 2026-02-11 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = '0120935ce9e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('organizations', sa.Column('stripe_price_id', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('organizations', 'stripe_price_id')
