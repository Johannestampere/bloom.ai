# schemas/mindmap.py
from pydantic import BaseModel, field_validator, Field
from typing import List, Optional
from datetime import datetime
from uuid import UUID


# BASE SCHEMAS

class NodeBase(BaseModel):
    title: str
    content: Optional[str] = None
    x_position: float
    y_position: float
    parent_id: Optional[int] = None

    @classmethod
    @field_validator('title')
    def title_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Title cannot be empty')
        return v.strip()



class MindMapBase(BaseModel):
    title: str

    @classmethod
    @field_validator('title')
    def title_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Title cannot be empty')
        return v.strip()



class VoteBase(BaseModel):
    pass


# CREATE SCHEMAS

# this is what the frontend sends on node creation
class NodeCreate(BaseModel):
    mindmap_id: int
    title: str
    content: Optional[str] = None
    parent_id: int


class MindMapCreate(MindMapBase):
    pass


class VoteCreate(VoteBase):
    pass


# UPDATE SCHEMAS

class NodeUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    x_position: Optional[float] = None
    y_position: Optional[float] = None
    parent_id: Optional[int] = None
    order_index: Optional[int] = None

    @classmethod
    @field_validator('title')
    def title_must_not_be_empty(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Title cannot be empty')
        return v.strip() if v else v



class MindMapUpdate(BaseModel):
    title: Optional[str] = None

    @classmethod
    @field_validator('title')
    def title_must_not_be_empty(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Title cannot be empty')
        return v.strip() if v else v



# RESPONSE SCHEMAS

# this is what the backend send to the frontend on node creation
#   includes the backend-calculated order_index, X and Y positions
class NodeCreateResponse(BaseModel):
    id: int
    mindmap_id: int
    x_position: float
    y_position: float
    order_index: int
    created_at: datetime

    class Config:
        from_attributes = True

# this is what the backend send to the frontend on node retrieval
#   includes more information like vote_count, user_votes
class NodeResponse(BaseModel):
    id: int
    mindmap_id: int
    parent_id: Optional[int]
    title: str
    content: Optional[str]
    x_position: float
    y_position: float
    order_index: int
    vote_count: int
    user_votes: List[UUID] = Field(default_factory=list)
    created_at: datetime

    class Config:
        from_attributes = True


class VoteResponse(VoteBase):
    id: int
    user_id: UUID  # Changed to UUID to match your User model
    node_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class MindMapResponse(MindMapBase):
    id: int
    owner_id: UUID
    nodes: List[NodeResponse] = []
    total_collaborators: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class MindMapListResponse(BaseModel):
    id: int
    title: str
    node_count: int = 0
    total_collaborators: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


# COLLABORATION SCHEMAS

class CollaboratorInvite(BaseModel):
    email: str
    role: str = "collaborator"  # collaborator, viewer


class CollaboratorResponse(BaseModel):
    user_id: UUID
    email: str
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True


# AI GENERATION SCHEMAS

class AIIdeaRequest(BaseModel):
    node_id: int
    context: Optional[str] = None


class AIIdeaResponse(BaseModel):
    ideas: List[str]
    summary: str
    related_themes: List[str]


# ERROR SCHEMAS

class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None
    timestamp: datetime


# SUCCESS SCHEMAS

class SuccessResponse(BaseModel):
    message: str
    data: Optional[dict] = None