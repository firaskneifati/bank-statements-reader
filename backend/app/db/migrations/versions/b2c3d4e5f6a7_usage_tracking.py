"""usage tracking

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-02-11 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Create export_logs table ─────────────────────────────────────
    op.create_table(
        'export_logs',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('org_id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('format', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('transaction_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_export_logs_org_id', 'export_logs', ['org_id'])
    op.create_index('ix_export_logs_user_id', 'export_logs', ['user_id'])

    # ── Add usage counters to organizations ──────────────────────────
    org_columns = [
        ('total_uploads', sa.Integer(), '0'),
        ('total_documents', sa.Integer(), '0'),
        ('total_pages', sa.Integer(), '0'),
        ('total_transactions', sa.Integer(), '0'),
        ('total_exports', sa.Integer(), '0'),
        ('total_bytes_processed', sa.Integer(), '0'),
        ('month_uploads', sa.Integer(), '0'),
        ('month_documents', sa.Integer(), '0'),
        ('month_pages', sa.Integer(), '0'),
        ('month_transactions', sa.Integer(), '0'),
        ('month_exports', sa.Integer(), '0'),
        ('month_bytes_processed', sa.Integer(), '0'),
    ]
    for col_name, col_type, default in org_columns:
        op.add_column('organizations', sa.Column(col_name, col_type, nullable=False, server_default=default))

    op.add_column('organizations', sa.Column('usage_reset_at', sa.DateTime(), nullable=True))
    # Backfill usage_reset_at from created_at
    op.execute("UPDATE organizations SET usage_reset_at = created_at WHERE usage_reset_at IS NULL")
    op.alter_column('organizations', 'usage_reset_at', nullable=False)

    # ── Modify uploads table ─────────────────────────────────────────
    # Add new columns
    op.add_column('uploads', sa.Column('document_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('uploads', sa.Column('page_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('uploads', sa.Column('bytes_processed', sa.Integer(), nullable=False, server_default='0'))

    # Remove old columns
    op.drop_constraint('uploads_client_id_fkey', 'uploads', type_='foreignkey')
    op.drop_column('uploads', 'client_id')
    op.drop_column('uploads', 'filename')
    op.drop_column('uploads', 'total_debits')
    op.drop_column('uploads', 'total_credits')

    # Make uploaded_by_user_id non-nullable
    op.execute("UPDATE uploads SET uploaded_by_user_id = (SELECT id FROM users LIMIT 1) WHERE uploaded_by_user_id IS NULL")
    op.alter_column('uploads', 'uploaded_by_user_id', nullable=False)
    op.create_index('ix_uploads_uploaded_by_user_id', 'uploads', ['uploaded_by_user_id'])

    # ── Drop transaction_records table ───────────────────────────────
    op.drop_table('transaction_records')


def downgrade() -> None:
    # ── Re-create transaction_records ────────────────────────────────
    op.create_table(
        'transaction_records',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('org_id', sa.Uuid(), nullable=False),
        sa.Column('upload_id', sa.Uuid(), nullable=False),
        sa.Column('client_id', sa.Uuid(), nullable=True),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('posting_date', sa.Date(), nullable=True),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('balance', sa.Float(), nullable=True),
        sa.Column('category', sa.String(), nullable=False, server_default='Other'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id']),
        sa.ForeignKeyConstraint(['upload_id'], ['uploads.id']),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_transaction_records_org_id', 'transaction_records', ['org_id'])
    op.create_index('ix_transaction_records_upload_id', 'transaction_records', ['upload_id'])

    # ── Restore uploads table ────────────────────────────────────────
    op.drop_index('ix_uploads_uploaded_by_user_id', table_name='uploads')
    op.alter_column('uploads', 'uploaded_by_user_id', nullable=True)
    op.add_column('uploads', sa.Column('client_id', sa.Uuid(), nullable=True))
    op.add_column('uploads', sa.Column('filename', sa.String(), nullable=True))
    op.add_column('uploads', sa.Column('total_debits', sa.Float(), nullable=True, server_default='0'))
    op.add_column('uploads', sa.Column('total_credits', sa.Float(), nullable=True, server_default='0'))
    op.create_foreign_key('uploads_client_id_fkey', 'uploads', 'clients', ['client_id'], ['id'])

    op.drop_column('uploads', 'bytes_processed')
    op.drop_column('uploads', 'page_count')
    op.drop_column('uploads', 'document_count')

    # ── Remove usage counters from organizations ─────────────────────
    op.drop_column('organizations', 'usage_reset_at')
    for col_name in [
        'month_bytes_processed', 'month_exports', 'month_transactions',
        'month_pages', 'month_documents', 'month_uploads',
        'total_bytes_processed', 'total_exports', 'total_transactions',
        'total_pages', 'total_documents', 'total_uploads',
    ]:
        op.drop_column('organizations', col_name)

    # ── Drop export_logs table ───────────────────────────────────────
    op.drop_index('ix_export_logs_user_id', table_name='export_logs')
    op.drop_index('ix_export_logs_org_id', table_name='export_logs')
    op.drop_table('export_logs')
