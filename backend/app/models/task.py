import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, Date, DateTime, ForeignKey, Numeric, Index, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    phase_id = Column(UUID(as_uuid=True), ForeignKey("phases.id", ondelete="CASCADE"), nullable=False)
    parent_task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    task_level = Column(String(20), nullable=False)
    assignee_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=False)
    estimated_hours = Column(Numeric(10, 2), nullable=False, default=0)
    actual_hours = Column(Numeric(10, 2), nullable=True)
    status = Column(String(20), nullable=False, default="not_started")
    weight = Column(Numeric(5, 2), nullable=False, default=1.00)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_tasks_project_phase_parent", "project_id", "phase_id", "parent_task_id"),
        Index("ix_tasks_assignee", "assignee_id"),
        Index("ix_tasks_status", "status"),
    )


class TaskCollaborator(Base):
    __tablename__ = "task_collaborators"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    __table_args__ = (UniqueConstraint("task_id", "user_id", name="uq_task_collaborator"),)


class TaskDependency(Base):
    __tablename__ = "task_dependencies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    depends_on_task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    dependency_type = Column(String(2), nullable=False, default="fs")
    lag_days = Column(Integer, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint("task_id", "depends_on_task_id", name="uq_task_dependency"),
        CheckConstraint("task_id <> depends_on_task_id", name="ck_no_self_dependency"),
    )
