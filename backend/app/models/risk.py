import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Date, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Risk(Base):
    __tablename__ = "risks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    phase_id = Column(UUID(as_uuid=True), ForeignKey("phases.id", ondelete="SET NULL"), nullable=True)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    impact = Column(String(10), nullable=False)
    probability = Column(String(10), nullable=False)
    priority = Column(String(10), nullable=False)
    status = Column(String(20), nullable=False, default="unaddressed")
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class RiskCountermeasure(Base):
    __tablename__ = "risk_countermeasures"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    risk_id = Column(UUID(as_uuid=True), ForeignKey("risks.id", ondelete="CASCADE"), nullable=False)
    description = Column(Text, nullable=False)
    assignee_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=False)
    due_date = Column(Date, nullable=True)
    status = Column(String(20), nullable=False, default="planned")
