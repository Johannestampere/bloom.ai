"""Add is_ai_generated flag to nodes

Revision ID: 5c7d8e9f0abc
Revises: 4a6c5b3d2e1f
Create Date: 2025-12-04 02:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5c7d8e9f0abc"
down_revision: Union[str, None] = "4a6c5b3d2e1f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "nodes",
        sa.Column("is_ai_generated", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade() -> None:
    op.drop_column("nodes", "is_ai_generated")


