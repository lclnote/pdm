from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class ApplicationCreate(BaseModel):
    task_id: Optional[str] = None
    phase_id: Optional[str] = None
    application_type: str
    reason: str
    evidence: Optional[str] = None


class ApplicationResponse(BaseModel):
    id: UUID
    project_id: UUID
    task_id: Optional[UUID] = None
    phase_id: Optional[UUID] = None
    application_type: str
    reason: str
    evidence: Optional[str] = None
    status: str
    applicant_id: UUID
    reviewer_id: Optional[UUID] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApplicationApprove(BaseModel):
    application_type: str


class ApplicationReject(BaseModel):
    application_type: str
    rejection_reason: str
