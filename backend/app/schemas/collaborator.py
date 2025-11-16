from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


# Request schemas
class CollaboratorInvite(BaseModel):
    """Schema for inviting a collaborator"""
    email: EmailStr = Field(..., description="Email of the user to invite")
    role: str = Field(default="editor", pattern="^(owner|editor|viewer)$", description="Role to assign")


class CollaboratorUpdate(BaseModel):
    """Schema for updating a collaborator's role"""
    role: str = Field(..., pattern="^(owner|editor|viewer)$", description="New role to assign")


# Response schemas
class CollaboratorResponse(BaseModel):
    """Schema for collaborator response"""
    id: int
    mindmap_id: int
    user_id: UUID
    role: str
    invited_by: Optional[UUID]
    invited_at: datetime
    accepted_at: Optional[datetime]
    status: str

    # User details (populated via join)
    user_email: Optional[str] = None
    user_name: Optional[str] = None

    class Config:
        from_attributes = True


class InvitationResponse(BaseModel):
    """Schema for invitation list response"""
    id: int
    mindmap_id: int
    mindmap_title: str
    role: str
    invited_by: UUID
    inviter_name: Optional[str]
    inviter_email: str
    invited_at: datetime
    status: str

    class Config:
        from_attributes = True


class CollaboratorListResponse(BaseModel):
    """Schema for list of collaborators"""
    collaborators: list[CollaboratorResponse]
    total: int