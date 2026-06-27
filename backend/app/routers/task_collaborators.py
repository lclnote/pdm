from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.task import Task, TaskCollaborator
from app.models.user import User
from app.schemas.task import TaskCollaboratorCreate, TaskCollaboratorResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/api", tags=["task_collaborators"])


@router.get("/tasks/{task_id}/collaborators", response_model=list[TaskCollaboratorResponse])
async def list_collaborators(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TaskCollaborator).where(TaskCollaborator.task_id == task_id)
    )
    return [TaskCollaboratorResponse.model_validate(c) for c in result.scalars()]


@router.post("/tasks/{task_id}/collaborators", response_model=TaskCollaboratorResponse, status_code=status.HTTP_201_CREATED)
async def add_collaborator(
    task_id: str,
    data: TaskCollaboratorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task_result = await db.execute(select(Task).where(Task.id == task_id))
    if not task_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    existing = await db.execute(
        select(TaskCollaborator).where(
            TaskCollaborator.task_id == task_id,
            TaskCollaborator.user_id == data.user_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already a collaborator")

    collaborator = TaskCollaborator(task_id=task_id, user_id=data.user_id)
    db.add(collaborator)
    await db.commit()
    await db.refresh(collaborator)
    return TaskCollaboratorResponse.model_validate(collaborator)


@router.delete("/tasks/{task_id}/collaborators/{collaborator_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_collaborator(
    task_id: str,
    collaborator_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TaskCollaborator).where(
            TaskCollaborator.id == collaborator_id,
            TaskCollaborator.task_id == task_id,
        )
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collaborator not found")
    await db.delete(c)
    await db.commit()
