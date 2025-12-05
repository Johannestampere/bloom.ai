from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..core.database import get_db
from ..models import MindMap, Node, Vote
from ..schemas.mindmap import VoteResponse, SuccessResponse
from ..middleware.auth import get_current_user_id

router = APIRouter(prefix="/api", tags=["votes"])


# VOTE OPERATIONS

@router.post("/nodes/{node_id}/vote", response_model=VoteResponse, status_code=status.HTTP_201_CREATED)
async def vote_on_node(
        node_id: int,
        current_user_id: str = Depends(get_current_user_id),
        db: Session = Depends(get_db)
):
    """
    Vote on a specific node
    """
    try:
        # Verify node exists and user has access through mindmap
        node = db.query(Node).join(MindMap).filter(
            Node.id == node_id,
            MindMap.owner_id == current_user_id
        ).first()

        if not node:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Node not found"
            )

        # Check if user already voted on this node
        existing_vote = db.query(Vote).filter(
            Vote.node_id == node_id,
            Vote.user_id == current_user_id
        ).first()

        if existing_vote:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You have already voted on this node"
            )

        # Create new vote
        new_vote = Vote(
            user_id=current_user_id,
            node_id=node_id
        )

        db.add(new_vote)
        db.commit()
        db.refresh(new_vote)

        # Convert to response format
        response_data = {
            "id": hash(f"{current_user_id}_{node_id}"),  # Random id generation for response
            "user_id": new_vote.user_id,
            "node_id": new_vote.node_id,
            "created_at": new_vote.created_at
        }

        return VoteResponse(**response_data)

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to vote on node: {str(e)}"
        )


@router.delete("/nodes/{node_id}/vote", response_model=SuccessResponse)
async def remove_vote_from_node(
        node_id: int,
        current_user_id: str = Depends(get_current_user_id),
        db: Session = Depends(get_db)
):
    """
    Remove vote from a specific node
    """
    try:
        # Verify node exists and user has access through mindmap
        node = db.query(Node).join(MindMap).filter(
            Node.id == node_id,
            MindMap.owner_id == current_user_id
        ).first()

        if not node:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Node not found"
            )

        # Find existing vote
        existing_vote = db.query(Vote).filter(
            Vote.node_id == node_id,
            Vote.user_id == current_user_id
        ).first()

        if not existing_vote:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vote not found"
            )

        # Remove vote
        db.delete(existing_vote)
        db.commit()

        return SuccessResponse(
            message="Vote removed successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove vote: {str(e)}"
        )


@router.get("/nodes/{node_id}/votes", response_model=List[VoteResponse])
async def get_node_votes(
        node_id: int,
        current_user_id: str = Depends(get_current_user_id),
        db: Session = Depends(get_db)
):
    """
    Get all votes for a specific node
    """
    try:
        # Verify node exists and user has access through mindmap
        node = db.query(Node).join(MindMap).filter(
            Node.id == node_id,
            MindMap.owner_id == current_user_id
        ).first()

        if not node:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Node not found"
            )

        # Get all votes for this node
        votes = db.query(Vote).filter(Vote.node_id == node_id).all()

        # Convert to response format
        result = []
        for vote in votes:
            vote_data = {
                "id": hash(f"{vote.user_id}_{vote.node_id}"),  # Generate pseudo-id
                "user_id": vote.user_id,
                "node_id": vote.node_id,
                "created_at": vote.created_at
            }
            result.append(VoteResponse(**vote_data))

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch votes: {str(e)}"
        )


@router.get("/mindmaps/{mindmap_id}/votes/summary")
async def get_mindmap_vote_summary(
        mindmap_id: int,
        current_user_id: str = Depends(get_current_user_id),
        db: Session = Depends(get_db)
):
    """
    Get vote summary for all nodes in a mindmap
    """
    try:
        # Verify mindmap ownership
        mindmap = db.query(MindMap).filter(
            MindMap.id == mindmap_id,
            MindMap.owner_id == current_user_id
        ).first()

        if not mindmap:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mindmap not found"
            )

        # Get vote summary for all nodes in this mindmap
        vote_summary = db.query(
            Node.id,
            Node.title,
            db.func.count(Vote.user_id).label('vote_count')
        ).outerjoin(Vote).filter(
            Node.mindmap_id == mindmap_id
        ).group_by(Node.id, Node.title).all()

        result = []
        for node_id, node_title, vote_count in vote_summary:
            result.append({
                "node_id": node_id,
                "node_title": node_title,
                "vote_count": vote_count or 0
            })

        return {
            "mindmap_id": mindmap_id,
            "total_nodes": len(result),
            "nodes": result
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch vote summary: {str(e)}"
        )


# COLLABORATIVE VOTING FEATURES

@router.get("/mindmaps/{mindmap_id}/popular-nodes")
async def get_popular_nodes(
        mindmap_id: int,
        current_user_id: str = Depends(get_current_user_id),
        db: Session = Depends(get_db),
        limit: int = 10
):
    """
    Get the most popular nodes (highest voted) in a mindmap
    """
    try:
        # Verify mindmap ownership
        mindmap = db.query(MindMap).filter(
            MindMap.id == mindmap_id,
            MindMap.owner_id == current_user_id
        ).first()

        if not mindmap:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mindmap not found"
            )

        # Get nodes ordered by vote count
        popular_nodes = db.query(
            Node,
            db.func.count(Vote.user_id).label('vote_count')
        ).outerjoin(Vote).filter(
            Node.mindmap_id == mindmap_id
        ).group_by(Node.id).order_by(
            db.func.count(Vote.user_id).desc()
        ).limit(limit).all()

        result = []
        for node, vote_count in popular_nodes:
            # Get user votes for this node
            votes = db.query(Vote).filter(Vote.node_id == node.id).all()
            user_votes = [vote.user_id for vote in votes]

            node_data = {
                "id": node.id,
                "title": node.title,
                "content": node.content,
                "x_position": node.x_position,
                "y_position": node.y_position,
                "parent_id": node.parent_id,
                "mindmap_id": node.mindmap_id,
                "vote_count": vote_count or 0,
                "user_votes": user_votes,
                "created_at": node.created_at
            }
            result.append(node_data)

        return {
            "mindmap_id": mindmap_id,
            "popular_nodes": result
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch popular nodes: {str(e)}"
        )


# VOTE ANALYTICS

@router.get("/mindmaps/{mindmap_id}/vote-analytics")
async def get_vote_analytics(
        mindmap_id: int,
        current_user_id: str = Depends(get_current_user_id),
        db: Session = Depends(get_db)
):
    """
    Get detailed vote analytics for a mindmap
    """
    try:
        # Verify mindmap ownership
        mindmap = db.query(MindMap).filter(
            MindMap.id == mindmap_id,
            MindMap.owner_id == current_user_id
        ).first()

        if not mindmap:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mindmap not found"
            )

        # Get total vote counts
        total_votes = db.query(Vote).join(Node).filter(
            Node.mindmap_id == mindmap_id
        ).count()

        # Get unique voters
        unique_voters = db.query(Vote.user_id).join(Node).filter(
            Node.mindmap_id == mindmap_id
        ).distinct().count()

        # Get total nodes
        total_nodes = db.query(Node).filter(Node.mindmap_id == mindmap_id).count()

        # Get nodes with votes vs without
        nodes_with_votes = db.query(Node.id).join(Vote).filter(
            Node.mindmap_id == mindmap_id
        ).distinct().count()

        return {
            "mindmap_id": mindmap_id,
            "total_votes": total_votes,
            "unique_voters": unique_voters,
            "total_nodes": total_nodes,
            "nodes_with_votes": nodes_with_votes,
            "nodes_without_votes": total_nodes - nodes_with_votes,
            "engagement_rate": round((nodes_with_votes / total_nodes * 100), 2) if total_nodes > 0 else 0
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch vote analytics: {str(e)}"
        )