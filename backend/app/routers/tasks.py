from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.task import Task, TaskCollaborator, TaskDependency
from app.models.phase import Phase
from app.models.user import User
from app.schemas.task import (
    TaskCreate, TaskUpdate, TaskResponse,
    TaskStatusUpdate, TaskStatusResponse,
    TaskDependencyCreate, TaskDependencyResponse,
    TaskCollaboratorCreate, TaskCollaboratorResponse,
)
from app.services.auth import get_current_user
from app.services.state_machine import is_transition_allowed, can_perform_transition

router = APIRouter(prefix="/api", tags=["tasks"])


def _get_task_level(parent_task_id, db_parent):
    if parent_task_id is None:
        return "root"
    p = db_parent
    if p.task_level == "root":
        return "child"
    return "grandchild"


@router.get("/phases/{phase_id}/tasks", response_model=list[TaskResponse])
async def list_tasks(
    phase_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Task)
        .where(Task.phase_id == phase_id)
        .order_by(Task.sort_order)
    )
    tasks = result.scalars().all()

    def build_tree(parent_id=None):
        children = [t for t in tasks if t.parent_task_id == parent_id]
        result_list = []
        for t in children:
            task_resp = TaskResponse.model_validate(t)
            task_resp.children = build_tree(t.id)
            result_list.append(task_resp)
        return result_list

    return build_tree(None)


@router.post("/phases/{phase_id}/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    phase_id: str,
    data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    phase_result = await db.execute(select(Phase).where(Phase.id == phase_id))
    phase = phase_result.scalar_one_or_none()
    if not phase:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phase not found")

    parent = None
    if data.parent_task_id:
        parent_result = await db.execute(select(Task).where(Task.id == data.parent_task_id))
        parent = parent_result.scalar_one_or_none()
        if not parent:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent task not found")

    task = Task(
        project_id=phase.project_id,
        phase_id=phase_id,
        parent_task_id=data.parent_task_id,
        name=data.name,
        description=data.description,
        task_level=_get_task_level(data.parent_task_id, parent),
        assignee_id=data.assignee_id,
        estimated_hours=data.estimated_hours,
        weight=data.weight,
        start_date=data.start_date,
        end_date=data.end_date,
        sort_order=data.sort_order,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return TaskResponse.model_validate(task)


@router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Task).where(Task.id == task_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return TaskResponse.model_validate(task)


@router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    await db.commit()
    await db.refresh(task)
    return TaskResponse.model_validate(task)


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    await db.delete(task)
    await db.commit()


@router.put("/tasks/{task_id}/status", response_model=TaskStatusResponse)
async def update_task_status(
    task_id: str,
    data: TaskStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    previous = task.status
    task.status = data.status
    await db.commit()
    await db.refresh(task)
    return TaskStatusResponse(
        id=str(task.id),
        name=task.name,
        status=task.status,
        actual_hours=float(task.actual_hours) if task.actual_hours else None,
        previous_status=previous,
        transition_allowed=True,
        message=f"Status changed from '{previous}' to '{task.status}'",
    )


@router.get("/tasks/{task_id}/dependencies", response_model=list[TaskDependencyResponse])
async def list_dependencies(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TaskDependency).where(TaskDependency.task_id == task_id)
    )
    return [TaskDependencyResponse.model_validate(d) for d in result.scalars()]


@router.post("/tasks/{task_id}/dependencies", response_model=TaskDependencyResponse, status_code=status.HTTP_201_CREATED)
async def create_dependency(
    task_id: str,
    data: TaskDependencyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dep = TaskDependency(
        task_id=task_id,
        depends_on_task_id=data.depends_on_task_id,
        dependency_type=data.dependency_type,
        lag_days=data.lag_days,
    )
    db.add(dep)
    await db.commit()
    await db.refresh(dep)
    return TaskDependencyResponse.model_validate(dep)


@router.delete("/tasks/{task_id}/dependencies/{dep_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dependency(
    task_id: str,
    dep_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await db.execute(
        delete(TaskDependency).where(
            TaskDependency.id == dep_id,
            TaskDependency.task_id == task_id,
        )
    )
    await db.commit()
