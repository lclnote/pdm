from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.application import Application
from app.models.task import Task
from app.models.phase import Phase
from app.models.user import User
from app.schemas.application import ApplicationCreate, ApplicationResponse, ApplicationApprove, ApplicationReject
from app.services.auth import get_current_user

router = APIRouter(prefix="/api", tags=["applications"])


@router.post("/tasks/apply", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def create_application(
    data: ApplicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resolved_project_id = None
    if data.task_id:
        task_res = await db.execute(select(Task).where(Task.id == data.task_id))
        task = task_res.scalar_one_or_none()
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
        phase_res = await db.execute(select(Phase).where(Phase.id == task.phase_id))
        phase = phase_res.scalar_one_or_none()
        if not phase:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phase of the task not found")
        resolved_project_id = phase.project_id
    elif data.phase_id:
        phase_res = await db.execute(select(Phase).where(Phase.id == data.phase_id))
        phase = phase_res.scalar_one_or_none()
        if not phase:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phase not found")
        resolved_project_id = phase.project_id
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Either task_id or phase_id is required")

    app = Application(
        project_id=resolved_project_id,
        task_id=data.task_id,
        phase_id=data.phase_id,
        application_type=data.application_type,
        reason=data.reason,
        evidence=data.evidence,
        applicant_id=current_user.id,
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return ApplicationResponse.model_validate(app)


@router.get("/applications", response_model=list[ApplicationResponse])
async def list_applications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Application).order_by(Application.created_at.desc())
    )
    return [ApplicationResponse.model_validate(a) for a in result.scalars()]


@router.put("/applications/{app_id}/approve", response_model=dict)
async def approve_application(
    app_id: str,
    data: ApplicationApprove,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Application).where(Application.id == app_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    if app.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Application is not pending")
    app.status = "approved"
    app.reviewer_id = current_user.id
    await db.commit()
    return {
        "id": str(app.id),
        "status": app.status,
        "reviewer_id": str(current_user.id),
        "message": f"{app.application_type} application approved",
    }


@router.put("/applications/{app_id}/reject", response_model=dict)
async def reject_application(
    app_id: str,
    data: ApplicationReject,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Application).where(Application.id == app_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    if app.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Application is not pending")
    app.status = "rejected"
    app.reviewer_id = current_user.id
    app.rejection_reason = data.rejection_reason
    await db.commit()
    return {
        "id": str(app.id),
        "status": app.status,
        "reviewer_id": str(current_user.id),
        "rejection_reason": data.rejection_reason,
        "message": f"{app.application_type} application rejected",
    }
