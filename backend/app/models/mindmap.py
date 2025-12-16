from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from ..core.database import Base
from sqlalchemy.dialects.postgresql import UUID


class MindMap(Base):
    __tablename__ = "mindmaps"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    owner_id = Column("created_by", UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("User", back_populates="mindmaps")
    nodes = relationship(
        "Node",
        back_populates="mindmap",
        cascade="all, delete-orphan",
    )
    collaborators = relationship(
        "Collaborator",
        back_populates="mindmap",
        cascade="all, delete-orphan",
    )
