"""Add x_position and y_position to nodes

Revision ID: 2e3f4a5b6c7d
Revises: 1398029e50e2
Create Date: 2025-12-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "2e3f4a5b6c7d"
down_revision: Union[str, None] = "1398029e50e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add x_position and y_position columns to nodes table."""
    op.add_column(
        "nodes",
        sa.Column("x_position", sa.Float(), nullable=False, server_default="0"),
    )
    op.add_column(
        "nodes",
        sa.Column("y_position", sa.Float(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    """Remove x_position and y_position columns from nodes table."""
    op.drop_column("nodes", "y_position")
    op.drop_column("nodes", "x_position")


