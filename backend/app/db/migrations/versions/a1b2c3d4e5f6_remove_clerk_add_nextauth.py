"""remove clerk add nextauth

Revision ID: a1b2c3d4e5f6
Revises: d58276e065fd
Create Date: 2026-02-10 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'd58276e065fd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop clerk_org_id from organizations
    op.drop_constraint('organizations_clerk_org_id_key', 'organizations', type_='unique')
    op.drop_column('organizations', 'clerk_org_id')

    # Drop clerk_user_id from users, add password_hash + auth_provider
    op.drop_constraint('users_clerk_user_id_key', 'users', type_='unique')
    op.drop_column('users', 'clerk_user_id')
    op.add_column('users', sa.Column('password_hash', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('users', sa.Column('auth_provider', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default='credentials'))
    op.create_unique_constraint('uq_users_email', 'users', ['email'])
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # Drop clerk_user_id from clients
    op.drop_column('clients', 'clerk_user_id')


def downgrade() -> None:
    # Re-add clerk_user_id to clients
    op.add_column('clients', sa.Column('clerk_user_id', sa.String(), nullable=True))

    # Remove new columns from users, re-add clerk_user_id
    op.drop_index('ix_users_email', table_name='users')
    op.drop_constraint('uq_users_email', 'users', type_='unique')
    op.drop_column('users', 'auth_provider')
    op.drop_column('users', 'password_hash')
    op.add_column('users', sa.Column('clerk_user_id', sa.String(), nullable=False))
    op.create_unique_constraint('users_clerk_user_id_key', 'users', ['clerk_user_id'])

    # Re-add clerk_org_id to organizations
    op.add_column('organizations', sa.Column('clerk_org_id', sa.String(), nullable=True))
    op.create_unique_constraint('organizations_clerk_org_id_key', 'organizations', ['clerk_org_id'])
