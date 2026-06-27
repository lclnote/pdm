from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class DeliverableBase(BaseModel):
    name: str
    description: Optional[str] = None
    type: str
    file_path: Optional[str] = None
    file_url: Optional[str] = None
    version: str = "1.0"


class DeliverableCreate(DeliverableBase):
    pass


class DeliverableUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    file_path: Optional[str] = None
    file_url: Optional[str] = None
    version: Optional[str] = None
    status: Optional[str] = None
    reviewer_id: Optional[str] = None


class DeliverableResponse(DeliverableBase):
    id: UUID
    task_id: UUID
    status: str
    reviewer_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReviewCreate(BaseModel):
    status: str
    comment: Optional[str] = None
