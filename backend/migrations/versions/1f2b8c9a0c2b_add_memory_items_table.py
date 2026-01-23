"""add_memory_items_table

Revision ID: 1f2b8c9a0c2b
Revises: d50d2ae98169
Create Date: 2026-01-22 10:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1f2b8c9a0c2b'
down_revision: Union[str, Sequence[str], None] = 'd50d2ae98169'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'memory_items',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('conversation_id', sa.Integer(), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('memory_type', sa.String(length=50), nullable=False, server_default='note'),
        sa.Column('source', sa.String(length=50), nullable=False, server_default='user'),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('is_auto', sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('(CURRENT_TIMESTAMP)')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('(CURRENT_TIMESTAMP)')),
        sa.Column('last_accessed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_index('idx_memory_items_user_id', 'memory_items', ['user_id'], unique=False)
    op.create_index('idx_memory_items_conversation_id', 'memory_items', ['conversation_id'], unique=False)
    op.create_index('idx_memory_items_updated_at', 'memory_items', ['updated_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    pass
