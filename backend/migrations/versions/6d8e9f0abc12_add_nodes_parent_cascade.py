"""Add CASCADE to nodes.parent_id foreign key

Revision ID: 6d8e9f0abc12
Revises: 5c7d8e9f0abc
Create Date: 2025-12-11 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6d8e9f0abc12"
down_revision: Union[str, None] = "5c7d8e9f0abc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop existing FK and recreate it with ON DELETE CASCADE
    op.drop_constraint(
        "nodes_parent_id_fkey",
        "nodes",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "nodes_parent_id_fkey",
        "nodes",
        "nodes",
        ["parent_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    # Revert to a foreign key without ON DELETE CASCADE
    op.drop_constraint(
        "nodes_parent_id_fkey",
        "nodes",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "nodes_parent_id_fkey",
        "nodes",
        "nodes",
        ["parent_id"],
        ["id"],
    )



