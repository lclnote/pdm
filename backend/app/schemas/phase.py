from datetime import datetime, date
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class PhaseBase(BaseModel):
    name: str
    description: Optional[str] = None
    sort_order: int = 0
    parallel_execution: bool = False
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class PhaseCreate(PhaseBase):
    pass


class PhaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None
    parallel_execution: Optional[bool] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class PhaseResponse(PhaseBase):
    id: UUID
    project_id: UUID
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GateRequest(BaseModel):
    reason: str
    evidence: Optional[str] = None
