from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, Float
from sqlalchemy.orm import relationship
from ..core.database import Base
from sqlalchemy.dialects.postgresql import UUID


class Node(Base):
    __tablename__ = "nodes"
    id = Column(Integer, primary_key=True)
    mindmap_id = Column(Integer, ForeignKey("mindmaps.id"), nullable=False)
    parent_id = Column(Integer, ForeignKey("nodes.id"), nullable=True)
    title = Column(String, nullable=False)
    content = Column(String, nullable=True)
    x_position = Column(Float, nullable=False, server_default="0")
    y_position = Column(Float, nullable=False, server_default="0")
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    like_count = Column(Integer, nullable=False, server_default="0")

    # Use string names for relationships
    creator = relationship("User", back_populates="nodes")
    mindmap = relationship("MindMap", back_populates="nodes")
    votes = relationship("Vote", back_populates="node", cascade="all, delete-orphan")