from typing import Optional
from pydantic import BaseModel


class DashboardResponse(BaseModel):
    project_id: str
    project_name: str
    progress: float
    completed_tasks: int
    total_tasks: int
    delayed_tasks: int
    remaining_days: int
    phase_summaries: list[dict]
    pending_applications: int
    risk_summary: dict
    issue_summary: dict
