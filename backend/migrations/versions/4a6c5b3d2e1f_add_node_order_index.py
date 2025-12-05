"""Add order_index to nodes for stable sibling ordering

Revision ID: 4a6c5b3d2e1f
Revises: 3f9b8c7d6e5f
Create Date: 2025-12-04 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "4a6c5b3d2e1f"
down_revision: Union[str, None] = "3f9b8c7d6e5f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add order_index column and backfill based on existing creation order."""
    op.add_column(
        "nodes",
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
    )

    # For existing rows, set order_index as row_number per (mindmap_id, parent_id) ordered by created_at, id.
    op.execute(
        """
        UPDATE nodes n
        SET order_index = sub.rn - 1
        FROM (
            SELECT id,
                   ROW_NUMBER() OVER (
                       PARTITION BY mindmap_id, parent_id
                       ORDER BY created_at, id
                   ) AS rn
            FROM nodes
        ) AS sub
        WHERE n.id = sub.id;
        """
    )


def downgrade() -> None:
    """Drop order_index column."""
    op.drop_column("nodes", "order_index")


