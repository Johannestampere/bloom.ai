from typing import List, Dict
from sqlalchemy.orm import Session
from ..models import Node


def build_branch_context(db: Session, node_id: int) -> List[Dict[str, str]]:
    """
    Walk from the selected node up to the root and return
    context ordered from root to selected.
    """
    context = []
    current = db.query(Node).filter(Node.id == node_id).first()

    if not current:
        return context

    while current:
        context.append({
            "title": current.title,
            "content": current.content or ""
        })
        if current.parent_id is None:
            break
        current = db.query(Node).filter(Node.id == current.parent_id).first()

    context.reverse() # root first
    return context
