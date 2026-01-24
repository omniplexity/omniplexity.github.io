"""Add project defaults and provider/model pins.

Revision ID: 9f4c0a4f5e72
Revises: 1f2b8c9a0c2b
Create Date: 2026-01-24
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "9f4c0a4f5e72"
down_revision = "1f2b8c9a0c2b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("default_provider", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("default_model", sa.String(length=255), nullable=True))

    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("default_provider", sa.String(length=100), nullable=True),
        sa.Column("default_model", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_projects_user_id", "projects", ["user_id"])

    with op.batch_alter_table("conversations") as batch_op:
        batch_op.add_column(sa.Column("project_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("provider", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("model", sa.String(length=255), nullable=True))
        batch_op.create_foreign_key("fk_conversations_project_id", "projects", ["project_id"], ["id"])
        batch_op.create_index("idx_conversations_project_id", ["project_id"])


def downgrade() -> None:
    with op.batch_alter_table("conversations") as batch_op:
        batch_op.drop_index("idx_conversations_project_id")
        batch_op.drop_constraint("fk_conversations_project_id", type_="foreignkey")
        batch_op.drop_column("model")
        batch_op.drop_column("provider")
        batch_op.drop_column("project_id")

    op.drop_index("idx_projects_user_id", table_name="projects")
    op.drop_table("projects")

    op.drop_column("users", "default_model")
    op.drop_column("users", "default_provider")
