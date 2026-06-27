from datetime import datetime
from typing import Optional, Any
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class TaskTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    tasks_json: Any  # stores serialized task tree


class TaskTemplateCreate(TaskTemplateBase):
    pass


class TaskTemplateResponse(TaskTemplateBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
