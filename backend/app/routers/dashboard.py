from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.project import Project
from app.models.phase import Phase
from app.models.task import Task
from app.models.risk import Risk
from app.models.issue import Issue
from app.models.application import Application
from app.models.user import User
from app.schemas.dashboard import DashboardResponse
from app.services.auth import get_current_user
from app.services.progress import calculate_project_progress
from datetime import date

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/projects/{project_id}/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project_result = await db.execute(select(Project).where(Project.id == project_id))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    progress = await calculate_project_progress(project_id, project.progress_calc_method, db)

    total_result = await db.execute(
        select(func.count()).select_from(Task).where(Task.project_id == project_id)
    )
    total_tasks = total_result.scalar() or 0

    completed_result = await db.execute(
        select(func.count()).select_from(Task).where(
            Task.project_id == project_id, Task.status == "completed"
        )
    )
    completed_tasks = completed_result.scalar() or 0

    delayed_result = await db.execute(
        select(func.count()).select_from(Task).where(
            Task.project_id == project_id,
            Task.end_date.isnot(None),
            Task.end_date < date.today(),
            Task.status != "completed",
        )
    )
    delayed_tasks = delayed_result.scalar() or 0

    phases_result = await db.execute(
        select(Phase).where(Phase.project_id == project_id).order_by(Phase.sort_order)
    )
    phases = phases_result.scalars().all()
    phase_summaries = []
    for ph in phases:
        p_total = await db.execute(
            select(func.count()).select_from(Task).where(Task.phase_id == ph.id)
        )
        p_completed = await db.execute(
            select(func.count()).select_from(Task).where(
                Task.phase_id == ph.id, Task.status == "completed"
            )
        )
        phase_summaries.append({
            "id": str(ph.id),
            "name": ph.name,
            "status": ph.status,
            "total_tasks": p_total.scalar() or 0,
            "completed_tasks": p_completed.scalar() or 0,
        })

    pending_apps_result = await db.execute(
        select(func.count()).select_from(Application).where(
            Application.project_id == project_id, Application.status == "pending"
        )
    )

    risks_result = await db.execute(
        select(Risk.status, func.count()).where(Risk.project_id == project_id).group_by(Risk.status)
    )
    risk_summary = {r.status: r[1] for r in risks_result} if risks_result else {}

    issues_result = await db.execute(
        select(Issue.status, func.count()).where(Issue.project_id == project_id).group_by(Issue.status)
    )
    issue_summary = {r.status: r[1] for r in issues_result} if issues_result else {}

    remaining_days = (project.end_date - date.today()).days if project.end_date else 0

    return DashboardResponse(
        project_id=str(project.id),
        project_name=project.name,
        progress=round(progress, 1),
        completed_tasks=completed_tasks,
        total_tasks=total_tasks,
        delayed_tasks=delayed_tasks,
        remaining_days=max(remaining_days, 0),
        phase_summaries=phase_summaries,
        pending_applications=pending_apps_result.scalar() or 0,
        risk_summary=risk_summary or {},
        issue_summary=issue_summary or {},
    )
