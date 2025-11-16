import uuid
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship
from ..core.database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    mindmaps = relationship("MindMap", back_populates="creator")
    nodes = relationship("Node", back_populates="creator")
    votes = relationship("Vote", back_populates="user")
    collaborations = relationship("Collaborator", foreign_keys="[Collaborator.user_id]", back_populates="user")
