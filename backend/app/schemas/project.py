from datetime import datetime, date
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: date
    end_date: date
    progress_calc_method: str = "task_count"


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None
    progress_calc_method: Optional[str] = None


class ProjectResponse(ProjectBase):
    id: UUID
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectMemberBase(BaseModel):
    user_id: UUID
    role_in_project: str


class ProjectMemberCreate(ProjectMemberBase):
    pass


class ProjectMemberResponse(ProjectMemberBase):
    id: UUID
    project_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
