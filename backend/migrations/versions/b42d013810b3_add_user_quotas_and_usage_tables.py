"""add_user_quotas_and_usage_tables

Revision ID: b42d013810b3
Revises: fd8507a11150
Create Date: 2026-01-18 16:29:03.464682

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b42d013810b3'
down_revision: Union[str, Sequence[str], None] = 'fd8507a11150'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create user_quotas table
    op.create_table('user_quotas',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('messages_per_day', sa.Integer(), nullable=False, default=200),
        sa.Column('tokens_per_day', sa.Integer(), nullable=False, default=200000),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('(CURRENT_TIMESTAMP)')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('user_id')
    )

    # Create user_usage_daily table
    op.create_table('user_usage_daily',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('day', sa.String(length=10), nullable=False),
        sa.Column('messages_used', sa.Integer(), nullable=False, default=0),
        sa.Column('tokens_used', sa.Integer(), nullable=False, default=0),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('(CURRENT_TIMESTAMP)')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('user_id', 'day')
    )

    # Create index
    op.create_index('idx_usage_user_day', 'user_usage_daily', ['user_id', 'day'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    pass