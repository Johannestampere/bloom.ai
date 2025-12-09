from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload
from typing import List
from ..core.database import get_db
from ..models import MindMap, Node, Vote, Collaborator
from ..schemas.mindmap import (
    MindMapCreate, MindMapUpdate, MindMapResponse,
    MindMapListResponse, SuccessResponse
)
from ..middleware.auth import get_current_user_id

router = APIRouter(prefix="/api/mindmaps", tags=["mindmaps"])


# MINDMAP CRUD OPERATIONS

@router.post("/", response_model=MindMapResponse, status_code=status.HTTP_201_CREATED)
async def create_mindmap(
        mindmap_data: MindMapCreate,
        current_user_id: str = Depends(get_current_user_id),
        db: Session = Depends(get_db)
):
    """
    Create a new mindmap for the authenticated user
    """
    try:
        # Create a new mindmap (using model fields)
        new_mindmap = MindMap(
            name=mindmap_data.title,
            owner_id=current_user_id
        )

        db.add(new_mindmap)
        db.commit()
        db.refresh(new_mindmap)

        # Create a root node automatically
        root_node = Node(
            title=mindmap_data.title,
            content=mindmap_data.title,
            mindmap_id=new_mindmap.id,
            order_index=0,
            x_position=0.0,
            y_position=0.0,
            created_by=current_user_id
        )

        db.add(root_node)
        db.commit()
        db.refresh(root_node)

        # Fetch the complete mindmap with nodes
        mindmap_with_nodes = db.query(MindMap).options(
            joinedload(MindMap.nodes)
        ).filter(MindMap.id == new_mindmap.id).first()

        # Convert to response format
        response_data = {
            "id": mindmap_with_nodes.id,
        }

        return MindMapResponse(**response_data)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create mindmap: {str(e)}"
        )


@router.get("/", response_model=List[MindMapListResponse])
async def get_all_mindmaps(
        current_user_id: str = Depends(get_current_user_id),
        db: Session = Depends(get_db),
        skip: int = 0,
        limit: int = 50
):
    """
    Get all mindmaps for the authenticated user
    """
    try:
        mindmaps = (
            db.query(MindMap)
            .outerjoin(
                Collaborator,
                (Collaborator.mindmap_id == MindMap.id)
                & (Collaborator.user_id == current_user_id)
                & (Collaborator.status == "accepted"),
            )
            .filter(or_(MindMap.owner_id == current_user_id, Collaborator.id.isnot(None)))
            .offset(skip)
            .limit(limit)
            .all()
        )

        # Add node count to each mindmap
        result = []
        for mindmap in mindmaps:
            node_count = db.query(Node).filter(Node.mindmap_id == mindmap.id).count()
            total_collaborators = db.query(Collaborator).filter(Collaborator.mindmap_id == mindmap.id).count()

            mindmap_dict = {
                "id": mindmap.id,
                "title": mindmap.name,
                "node_count": node_count,
                "total_collaborators": total_collaborators,
                "created_at": mindmap.created_at
            }
            result.append(MindMapListResponse(**mindmap_dict))

        return result

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch mindmaps: {str(e)}"
        )


@router.get("/{mindmap_id}", response_model=MindMapResponse)
async def get_mindmap_data(
        mindmap_id: int,
        current_user_id: str = Depends(get_current_user_id),
        db: Session = Depends(get_db)
):
    """
    Get a specific mindmap with all its nodes
    """
    try:
        # Fetch mindmap with nodes
        mindmap = db.query(MindMap).options(
            joinedload(MindMap.nodes)
        ).filter(
            MindMap.id == mindmap_id,
            MindMap.owner_id == current_user_id
        ).first()

        if not mindmap:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mindmap not found"
            )

        # Convert nodes to a response format
        nodes_response = []
        for node in sorted(mindmap.nodes, key=lambda n: n.order_index):
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
            nodes_response.append(node_data)

        # Convert mindmap to response format
        response_data = {
            "id": mindmap.id,
            "title": mindmap.name,
            "nodes": nodes_response,
            "owner_id": mindmap.owner_id,
            "created_at": mindmap.created_at
        }

        return MindMapResponse(**response_data)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch mindmap: {str(e)}"
        )


@router.put("/{mindmap_id}", response_model=MindMapResponse)
async def update_mindmap(
        mindmap_id: int,
        mindmap_data: MindMapUpdate,
        current_user_id: str = Depends(get_current_user_id),
        db: Session = Depends(get_db)
):
    """
    Update a mindmap
    """
    try:
        # Find the mindmap
        mindmap = db.query(MindMap).filter(
            MindMap.id == mindmap_id,
            MindMap.owner_id == current_user_id
        ).first()

        if not mindmap:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mindmap not found"
            )

        # Update only the name field (the only field that exists)
        if mindmap_data.title:
            mindmap.name = mindmap_data.title

        db.commit()
        db.refresh(mindmap)

        # Return response
        response_data = {
            "id": mindmap.id,
            "title": mindmap.name,
            "owner_id": mindmap.owner_id,
            "nodes": [],
            "total_collaborators": 1,
            "created_at": mindmap.created_at
        }

        return MindMapResponse(**response_data)

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update mindmap: {str(e)}"
        )


@router.delete("/{mindmap_id}", response_model=SuccessResponse)
async def delete_mindmap(
        mindmap_id: int,
        current_user_id: str = Depends(get_current_user_id),
        db: Session = Depends(get_db)
):
    """
    Delete a mindmap and all its nodes
    """
    try:
        # Find the mindmap
        mindmap = db.query(MindMap).filter(
            MindMap.id == mindmap_id,
            MindMap.owner_id == current_user_id
        ).first()

        if not mindmap:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mindmap not found"
            )

        # Delete all votes for nodes in this mindmap (cascade should handle this)
        # Delete all nodes in this mindmap (cascade should handle this)
        # Delete the mindmap
        db.delete(mindmap)
        db.commit()

        return SuccessResponse(
            message=f"Mindmap '{mindmap.name}' deleted successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete mindmap: {str(e)}"
        )