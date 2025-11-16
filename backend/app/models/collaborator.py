from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UUID
from sqlalchemy.orm import relationship
from datetime import datetime

# Use relative import for Base
from ..core.database import Base


class Collaborator(Base):
    """
    Represents a collaborator on a mindmap
    Tracks invitations, permissions, and collaboration status
    """
    __tablename__ = "collaborators"

    id = Column(Integer, primary_key=True, index=True)
    mindmap_id = Column(Integer, ForeignKey("mindmaps.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Role can be: 'owner', 'editor', 'viewer'
    role = Column(String(20), nullable=False, default="editor")

    # Invitation tracking
    invited_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    invited_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    accepted_at = Column(DateTime, nullable=True)

    # Status can be: 'pending', 'accepted', 'declined'
    status = Column(String(20), nullable=False, default="pending")

    # Relationships
    mindmap = relationship("MindMap", back_populates="collaborators")
    user = relationship("User", foreign_keys=[user_id], back_populates="collaborations")
    inviter = relationship("User", foreign_keys=[invited_by])

    def __repr__(self):
        return f"<Collaborator(id={self.id}, mindmap_id={self.mindmap_id}, user_id={self.user_id}, role={self.role}, status={self.status})>"