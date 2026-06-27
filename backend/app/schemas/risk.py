from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class RiskBase(BaseModel):
    name: str
    description: Optional[str] = None
    impact: str
    probability: str


class RiskCreate(RiskBase):
    phase_id: Optional[str] = None
    task_id: Optional[str] = None


class RiskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    impact: Optional[str] = None
    probability: Optional[str] = None
    status: Optional[str] = None


class RiskResponse(RiskBase):
    id: UUID
    project_id: UUID
    phase_id: Optional[UUID] = None
    task_id: Optional[UUID] = None
    priority: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RiskCountermeasureCreate(BaseModel):
    description: str
    assignee_id: str
    due_date: Optional[str] = None


class RiskCountermeasureResponse(BaseModel):
    id: UUID
    risk_id: UUID
    description: str
    assignee_id: UUID
    due_date: Optional[str] = None
    status: str

    model_config = ConfigDict(from_attributes=True)
