# routers/nodes.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List
from ..core.database import get_db
from ..models import MindMap, Node, Vote
from ..schemas.mindmap import (
    NodeCreate, NodeUpdate, NodeCreateResponse, NodeResponse,
    SuccessResponse, AISuggestionResponse, AISuggestion
)
from ..middleware.auth import get_current_user_id
from ..utils import layout
from ..services.ai_context import build_branch_context
from ..services.ai import generate_node_suggestions
from ..services.rate_limit import check_ai_rate_limit, increment_ai_usage, get_remaining_ai_uses
from .collaborators import check_mindmap_access

router = APIRouter(prefix="/api", tags=["nodes"])


# NODE CRUD OPERATIONS

@router.post("/mindmaps/{mindmap_id}/nodes", response_model=NodeCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_node(
        mindmap_id: int,
        node_data: NodeCreate,
        current_user_id: str = Depends(get_current_user_id),
        db: Session = Depends(get_db)
):
    """
    Create a new node in a mindmap
    """
    try:
        # Verify user has access (owner or editor collaborator)
        mindmap = check_mindmap_access(mindmap_id, current_user_id, db, required_role="editor")

        # Verify parent node exists if specified
        if node_data.parent_id:
            parent_node = db.query(Node).filter(
                Node.id == node_data.parent_id,
                Node.mindmap_id == mindmap_id
            ).first()

            if not parent_node:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Parent node not found"
                )

        # Compute the next order_index among siblings (same parent within this mindmap)
        parent_id = node_data.parent_id if node_data.parent_id else None
        max_order = db.query(func.max(Node.order_index)).filter(
            Node.mindmap_id == mindmap_id,
            Node.parent_id == parent_id
        ).scalar()
        next_order_index = (max_order + 1) if max_order is not None else 0

        new_node = Node(
            title=node_data.title,
            content=node_data.content,
            mindmap_id=mindmap_id,
            parent_id=parent_id,
            order_index=next_order_index,
            # TODO: implement smarter backend layout; for now default to origin
            x_position=0.0,
            y_position=0.0,
            created_by=current_user_id
        )

        db.add(new_node)
        db.commit()
        db.refresh(new_node)

        tree = layout.load_tree(db, mindmap_id)
        positions = layout.compute_layout(tree)
        layout.apply_layout(db, positions)
        db.commit()
        db.refresh(new_node)

        response_data = {
            "id": new_node.id,
            "mindmap_id": new_node.mindmap_id,
            "x_position": new_node.x_position,
            "y_position": new_node.y_position,
            "order_index": new_node.order_index,
            "created_at": new_node.created_at
        }

        return NodeCreateResponse(**response_data)

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create node: {str(e)}"
        )


@router.get("/mindmaps/{mindmap_id}/nodes", response_model=List[NodeResponse])
async def get_mindmap_nodes(
        mindmap_id: int,
        current_user_id: str = Depends(get_current_user_id),
        db: Session = Depends(get_db)
):
    """
    Get all nodes for a specific mindmap
    """
    try:
        # Verify user has access (owner or any collaborator)
        check_mindmap_access(mindmap_id, current_user_id, db)

        # Get all nodes for this mindmap
        nodes = db.query(Node).filter(
            Node.mindmap_id == mindmap_id
        ).order_by(Node.id).all()

        # Convert to response format
        result = []
        for node in nodes:
            votes = db.query(Vote).filter(Vote.node_id == node.id).all()

            node_data = {
                "id": node.id,
                "title": node.title,
                "content": node.content,
                "x_position": node.x_position,
                "y_position": node.y_position,
                "parent_id": node.parent_id,
                "mindmap_id": node.mindmap_id,
                "order_index": node.order_index,
                "is_ai_generated": node.is_ai_generated,
                "vote_count": len(votes),
                "user_votes": [vote.user_id for vote in votes],
                "created_at": node.created_at
            }
            result.append(NodeResponse(**node_data))

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch nodes: {str(e)}"
        )


@router.get("/nodes/{node_id}", response_model=NodeResponse)
async def get_node(
        node_id: int,
        current_user_id: str = Depends(get_current_user_id),
        db: Session = Depends(get_db)
):
    """
    Get a specific node
    """
    try:
        # Get the node first
        node = db.query(Node).filter(Node.id == node_id).first()

        if not node:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Node not found"
            )

        # Verify user has access (owner or any collaborator)
        check_mindmap_access(node.mindmap_id, current_user_id, db)

        # Get vote information
        votes = db.query(Vote).filter(Vote.node_id == node.id).all()

        # Convert to response format
        response_data = {
            "id": node.id,
            "title": node.title,
            "content": node.content,
            "x_position": node.x_position,
            "y_position": node.y_position,
            "parent_id": node.parent_id,
            "mindmap_id": node.mindmap_id,
            "order_index": node.order_index,
            "is_ai_generated": node.is_ai_generated,
            "vote_count": len(votes),
            "user_votes": [vote.user_id for vote in votes],
            "created_at": node.created_at
        }

        return NodeResponse(**response_data)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch node: {str(e)}"
        )


@router.put("/nodes/{node_id}", response_model=NodeResponse)
async def update_node(
        node_id: int,
        node_data: NodeUpdate,
        current_user_id: str = Depends(get_current_user_id),
        db: Session = Depends(get_db)
):
    """
    Update a node
    """
    try:
        # Get the node first
        node = db.query(Node).filter(Node.id == node_id).first()

        if not node:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Node not found"
            )

        # Verify user has access (owner or editor collaborator)
        check_mindmap_access(node.mindmap_id, current_user_id, db, required_role="editor")

        # Verify the parent node exists if being updated
        if node_data.parent_id is not None:
            if node_data.parent_id == node_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Node cannot be its own parent"
                )

            if node_data.parent_id != 0:
                parent_node = db.query(Node).filter(
                    Node.id == node_data.parent_id,
                    Node.mindmap_id == node.mindmap_id
                ).first()

                if not parent_node:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Parent node not found"
                    )

        # Update fields
        if node_data.title:
            node.title = node_data.title
        if node_data.content is not None:
            node.content = node_data.content
        if node_data.x_position is not None:
            node.x_position = node_data.x_position
        if node_data.y_position is not None:
            node.y_position = node_data.y_position
        if node_data.parent_id is not None:
            node.parent_id = node_data.parent_id if node_data.parent_id != 0 else None
        if node_data.order_index is not None:
            node.order_index = node_data.order_index

        db.commit()
        db.refresh(node)

        # Get vote information
        votes = db.query(Vote).filter(Vote.node_id == node.id).all()

        # Convert to response format
        response_data = {
            "id": node.id,
            "title": node.title,
            "content": node.content,
            "x_position": node.x_position,
            "y_position": node.y_position,
            "parent_id": node.parent_id,
            "mindmap_id": node.mindmap_id,
            "order_index": node.order_index,
            "is_ai_generated": node.is_ai_generated,
            "vote_count": len(votes),
            "user_votes": [vote.user_id for vote in votes],
            "created_at": node.created_at
        }

        return NodeResponse(**response_data)

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update node: {str(e)}"
        )


@router.delete("/nodes/{node_id}", response_model=SuccessResponse)
async def delete_node(
        node_id: int,
        current_user_id: str = Depends(get_current_user_id),
        db: Session = Depends(get_db)
):
    """
    Delete a node and all its children
    """
    try:
        # Get the node first
        node = db.query(Node).filter(Node.id == node_id).first()

        if not node:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Node not found"
            )

        # Verify user has access (owner or editor collaborator)
        check_mindmap_access(node.mindmap_id, current_user_id, db, required_role="editor")

        # Store node content for a response message
        node_content = node.content

        # Delete the node and let CASCADE handle children
        db.delete(node)
        db.commit()

        return SuccessResponse(
            message=f"Node '{node_content}' and its children deleted successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete node: {str(e)}"
        )


# AI INTEGRATION ENDPOINTS

@router.post(
    "/nodes/{node_id}/ai-suggest",
    response_model=AISuggestionResponse
)
async def suggest_ai_nodes(
    node_id: int,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Generate AI node suggestions for a selected node.
    Suggestions are NOT persisted until the user accepts them.
    Rate limited to 5 requests per user per day.
    """
    # Check rate limit first
    is_allowed, current_count, limit = check_ai_rate_limit(current_user_id)
    if not is_allowed:
        remaining = get_remaining_ai_uses(current_user_id)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily AI limit reached ({limit} per day). Try again tomorrow.",
            headers={"X-RateLimit-Remaining": str(remaining), "X-RateLimit-Limit": str(limit)}
        )

    # Get the node first
    node = db.query(Node).filter(Node.id == node_id).first()

    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    # Verify user has access (owner or any collaborator can request suggestions)
    check_mindmap_access(node.mindmap_id, current_user_id, db)

    context_nodes = build_branch_context(db, node_id)

    if not context_nodes:
        raise HTTPException(status_code=400, detail="Invalid node context")

    raw_suggestions = generate_node_suggestions(
        context_nodes,
        suggestions_count=3
    )

    # Increment usage counter after successful generation
    increment_ai_usage(current_user_id)

    return AISuggestionResponse(
        suggestions=[AISuggestion(**s) for s in raw_suggestions]
    )
