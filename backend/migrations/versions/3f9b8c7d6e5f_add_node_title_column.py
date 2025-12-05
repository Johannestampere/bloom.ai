"""Add title column to nodes and make content optional

Revision ID: 3f9b8c7d6e5f
Revises: 2e3f4a5b6c7d
Create Date: 2025-12-04 00:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "3f9b8c7d6e5f"
down_revision: Union[str, None] = "2e3f4a5b6c7d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add title column to nodes and relax content nullability."""
    # 1. Add title as nullable for now
    op.add_column("nodes", sa.Column("title", sa.String(), nullable=True))

    # 2. Copy existing content into title for all existing rows
    op.execute("UPDATE nodes SET title = content WHERE title IS NULL")

    # 3. Make title non-nullable
    op.alter_column("nodes", "title", existing_type=sa.String(), nullable=False)

    # 4. Make content nullable to match Optional[str] semantics in schemas
    op.alter_column("nodes", "content", existing_type=sa.String(), nullable=True)


def downgrade() -> None:
    """Revert title column addition and content nullability change."""
    # Optionally copy title back into content where content is NULL
    op.execute("UPDATE nodes SET content = title WHERE content IS NULL")

    # Make content non-nullable again
    op.alter_column("nodes", "content", existing_type=sa.String(), nullable=False)

    # Drop title column
    op.drop_column("nodes", "title")


