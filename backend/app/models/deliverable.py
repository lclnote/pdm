import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Deliverable(Base):
    __tablename__ = "deliverables"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(String(50), nullable=False)
    file_path = Column(String(500), nullable=True)
    file_url = Column(String(500), nullable=True)
    version = Column(String(50), nullable=False, default="1.0")
    status = Column(String(20), nullable=False, default="not_created")
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class DeliverableReview(Base):
    __tablename__ = "deliverable_reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deliverable_id = Column(UUID(as_uuid=True), ForeignKey("deliverables.id", ondelete="CASCADE"), nullable=False)
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    comment = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
