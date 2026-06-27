from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class IssueBase(BaseModel):
    name: str
    description: Optional[str] = None
    type: str
    priority: str


class IssueCreate(IssueBase):
    phase_id: Optional[str] = None
    task_id: Optional[str] = None
    risk_id: Optional[str] = None
    assignee_id: Optional[str] = None
    due_date: Optional[str] = None


class IssueUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    assignee_id: Optional[str] = None
    due_date: Optional[str] = None


class IssueResponse(IssueBase):
    id: UUID
    project_id: UUID
    phase_id: Optional[UUID] = None
    task_id: Optional[UUID] = None
    risk_id: Optional[UUID] = None
    status: str
    reporter_id: UUID
    assignee_id: Optional[UUID] = None
    due_date: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IssueCommentCreate(BaseModel):
    content: str


class IssueCommentResponse(BaseModel):
    id: UUID
    issue_id: UUID
    user_id: UUID
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
