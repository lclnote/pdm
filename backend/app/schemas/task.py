from datetime import datetime, date
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class TaskBase(BaseModel):
    name: str
    description: Optional[str] = None
    assignee_id: UUID
    estimated_hours: float = 0
    weight: float = 1.0
    progress: int = 0
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    sort_order: int = 0


class TaskCreate(TaskBase):
    parent_task_id: Optional[str] = None


class TaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    assignee_id: Optional[UUID] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    weight: Optional[float] = None
    progress: Optional[int] = None
    phase_id: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    sort_order: Optional[int] = None


class TaskResponse(TaskBase):
    id: UUID
    project_id: UUID
    phase_id: UUID
    parent_task_id: Optional[UUID] = None
    task_level: str
    actual_hours: Optional[float] = None
    status: str
    created_at: datetime
    updated_at: datetime
    children: Optional[list["TaskResponse"]] = None

    model_config = ConfigDict(from_attributes=True)


class TaskStatusUpdate(BaseModel):
    status: str


class TaskStatusResponse(BaseModel):
    id: str
    name: str
    status: str
    actual_hours: Optional[float] = None
    previous_status: str
    transition_allowed: bool
    message: str


class TaskDependencyCreate(BaseModel):
    depends_on_task_id: str
    dependency_type: str = "fs"
    lag_days: int = 0


class TaskDependencyResponse(BaseModel):
    id: UUID
    task_id: UUID
    depends_on_task_id: UUID
    dependency_type: str
    lag_days: int

    model_config = ConfigDict(from_attributes=True)


class TaskCollaboratorCreate(BaseModel):
    user_id: str


class TaskCollaboratorResponse(BaseModel):
    id: UUID
    task_id: UUID
    user_id: UUID

    model_config = ConfigDict(from_attributes=True)
