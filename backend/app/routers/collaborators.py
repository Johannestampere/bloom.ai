"""
Collaborators router - handles mindmap collaboration and invitations
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime

# Use relative imports instead of absolute imports
from ..core.database import get_db
from ..middleware.auth import get_current_user
from ..models.user import User
from ..models.mindmap import MindMap
from ..models.collaborator import Collaborator
from ..schemas.collaborator import (
    CollaboratorInvite,
    CollaboratorUpdate,
    CollaboratorResponse,
    InvitationResponse,
    CollaboratorListResponse
)

router = APIRouter(prefix="/api", tags=["collaborators"])

# Helper function to check if user owns or has access to mindmap
def check_mindmap_access(
        mindmap_id: int,
        user_id: UUID,
        db: Session,
        required_role: str = None
) -> MindMap:
    """
    Check if user has access to mindmap
    Returns the mindmap if access is granted, raises HTTPException otherwise
    """
    mindmap = db.query(MindMap).filter(MindMap.id == mindmap_id).first()
    if not mindmap:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mindmap not found"
        )

    # Check if user is the owner
    if mindmap.owner_id == user_id:
        return mindmap

    # Check if user is a collaborator
    collaboration = db.query(Collaborator).filter(
        Collaborator.mindmap_id == mindmap_id,
        Collaborator.user_id == user_id,
        Collaborator.status == "accepted"
    ).first()

    if not collaboration:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this mindmap"
        )

    # Check specific role if required
    if required_role:
        role_hierarchy = {"viewer": 0, "editor": 1, "owner": 2}
        if role_hierarchy.get(collaboration.role, 0) < role_hierarchy.get(required_role, 0):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You need {required_role} role to perform this action"
            )

    return mindmap


@router.post("/mindmaps/{mindmap_id}/invite", response_model=CollaboratorResponse)
async def invite_collaborator(
        mindmap_id: int,
        invitation: CollaboratorInvite,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    """
    Invite a user to collaborate on a mindmap
    Only the owner or editors can invite collaborators
    """
    # Check if current user has access (owner or editor)
    mindmap = check_mindmap_access(mindmap_id, current_user.id, db)

    # Only owner can invite
    if mindmap.owner_id != current_user.id:
        collaboration = db.query(Collaborator).filter(
            Collaborator.mindmap_id == mindmap_id,
            Collaborator.user_id == current_user.id,
            Collaborator.status == "accepted"
        ).first()

        if not collaboration or collaboration.role != "editor":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the owner or editors can invite collaborators"
            )

    # Find user by email
    invited_user = db.query(User).filter(User.email == invitation.email).first()
    if not invited_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with email {invitation.email} not found"
        )

    # Can't invite yourself
    if invited_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot invite yourself"
        )

    # Can't invite the owner
    if invited_user.id == mindmap.owner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already the owner of this mindmap"
        )

    # Check if invitation already exists
    existing = db.query(Collaborator).filter(
        Collaborator.mindmap_id == mindmap_id,
        Collaborator.user_id == invited_user.id
    ).first()

    if existing:
        if existing.status == "accepted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already a collaborator on this mindmap"
            )
        elif existing.status == "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invitation already sent to this user"
            )
        # If declined, we can re-invite by updating the existing record
        existing.status = "pending"
        existing.invited_at = datetime.utcnow()
        existing.invited_by = current_user.id
        existing.role = invitation.role
        db.commit()
        db.refresh(existing)
        return existing

    # Create new invitation
    new_collaborator = Collaborator(
        mindmap_id=mindmap_id,
        user_id=invited_user.id,
        role=invitation.role,
        invited_by=current_user.id,
        status="pending"
    )

    db.add(new_collaborator)
    db.commit()
    db.refresh(new_collaborator)

    return new_collaborator


@router.get("/invitations", response_model=List[InvitationResponse])
async def get_my_invitations(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    """
    Get all pending invitations for the current user
    """
    invitations = (
        db.query(
            Collaborator,
            MindMap.name.label("mindmap_title"),
            User.email.label("inviter_email"),
            User.username.label("inviter_name"),
        )
        .join(MindMap, Collaborator.mindmap_id == MindMap.id)
        .join(User, Collaborator.invited_by == User.id)
        .filter(
            Collaborator.user_id == current_user.id,
            Collaborator.status == "pending",
        )
        .all()
    )

    result = []
    for collab, mindmap_title, inviter_email, inviter_name in invitations:
        result.append(InvitationResponse(
            id=collab.id,
            mindmap_id=collab.mindmap_id,
            mindmap_title=mindmap_title,
            role=collab.role,
            invited_by=collab.invited_by,
            inviter_name=inviter_name,
            inviter_email=inviter_email,
            invited_at=collab.invited_at,
            status=collab.status
        ))

    return result


@router.post("/invitations/{invitation_id}/accept", response_model=CollaboratorResponse)
async def accept_invitation(
        invitation_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    """
    Accept a collaboration invitation
    """
    invitation = db.query(Collaborator).filter(
        Collaborator.id == invitation_id,
        Collaborator.user_id == current_user.id,
        Collaborator.status == "pending"
    ).first()

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found or already processed"
        )

    invitation.status = "accepted"
    invitation.accepted_at = datetime.utcnow()

    db.commit()
    db.refresh(invitation)

    return invitation


@router.post("/invitations/{invitation_id}/decline")
async def decline_invitation(
        invitation_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    """
    Decline a collaboration invitation
    """
    invitation = db.query(Collaborator).filter(
        Collaborator.id == invitation_id,
        Collaborator.user_id == current_user.id,
        Collaborator.status == "pending"
    ).first()

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found or already processed"
        )

    invitation.status = "declined"

    db.commit()

    return {"message": "Invitation declined"}


@router.get("/mindmaps/{mindmap_id}/collaborators", response_model=CollaboratorListResponse)
async def get_collaborators(
        mindmap_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    """
    Get all collaborators for a mindmap
    Only accessible by collaborators and owner
    """
    # Check if user has access
    check_mindmap_access(mindmap_id, current_user.id, db)

    
    collaborators = (
        db.query(
            Collaborator,
            User.email.label("user_email"),
            User.username.label("user_name"),
        )
        .join(User, Collaborator.user_id == User.id)
        .filter(
            Collaborator.mindmap_id == mindmap_id,
            Collaborator.status == "accepted",
        )
        .all()
    )

    result = []
    for collab, user_email, user_name in collaborators:
        collab_response = CollaboratorResponse(
            id=collab.id,
            mindmap_id=collab.mindmap_id,
            user_id=collab.user_id,
            role=collab.role,
            invited_by=collab.invited_by,
            invited_at=collab.invited_at,
            accepted_at=collab.accepted_at,
            status=collab.status,
            user_email=user_email,
            user_name=user_name
        )
        result.append(collab_response)

    return CollaboratorListResponse(
        collaborators=result,
        total=len(result)
    )


@router.put("/mindmaps/{mindmap_id}/collaborators/{user_id}", response_model=CollaboratorResponse)
async def update_collaborator_role(
        mindmap_id: int,
        user_id: UUID,
        update: CollaboratorUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    """
    Update a collaborator's role
    Only the owner can update roles
    """
    mindmap = db.query(MindMap).filter(MindMap.id == mindmap_id).first()
    if not mindmap:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mindmap not found"
        )

    # Only owner can update roles
    if mindmap.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can update collaborator roles"
        )

    # Find the collaborator
    collaborator = db.query(Collaborator).filter(
        Collaborator.mindmap_id == mindmap_id,
        Collaborator.user_id == user_id,
        Collaborator.status == "accepted"
    ).first()

    if not collaborator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collaborator not found"
        )

    collaborator.role = update.role
    db.commit()
    db.refresh(collaborator)

    return collaborator


@router.delete("/mindmaps/{mindmap_id}/collaborators/{user_id}")
async def remove_collaborator(
        mindmap_id: int,
        user_id: UUID,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    """
    Remove a collaborator from a mindmap
    Owner can remove anyone, collaborators can remove themselves
    """
    mindmap = db.query(MindMap).filter(MindMap.id == mindmap_id).first()
    if not mindmap:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mindmap not found"
        )

    # Check permissions
    is_owner = mindmap.owner_id == current_user.id
    is_removing_self = user_id == current_user.id

    if not is_owner and not is_removing_self:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only remove yourself unless you're the owner"
        )

    # Find and delete the collaborator
    collaborator = db.query(Collaborator).filter(
        Collaborator.mindmap_id == mindmap_id,
        Collaborator.user_id == user_id
    ).first()

    if not collaborator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collaborator not found"
        )

    db.delete(collaborator)
    db.commit()

    return {"message": "Collaborator removed successfully"}