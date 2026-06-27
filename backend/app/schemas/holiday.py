from datetime import date, datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class HolidayCreate(BaseModel):
    date: date
    name: Optional[str] = None
    is_working_day: str = "n"


class HolidayUpdate(BaseModel):
    name: Optional[str] = None
    is_working_day: Optional[str] = None


class HolidayResponse(BaseModel):
    id: UUID
    project_id: UUID
    date: date
    name: Optional[str] = None
    is_working_day: str

    model_config = ConfigDict(from_attributes=True)
