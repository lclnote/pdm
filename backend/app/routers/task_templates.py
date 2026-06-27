from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.task_template import TaskTemplate
from app.models.phase import Phase
from app.models.task import Task
from app.models.user import User
from app.schemas.task_template import TaskTemplateCreate, TaskTemplateResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/api", tags=["task_templates"])


@router.get("/task-templates", response_model=list[TaskTemplateResponse])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(TaskTemplate).order_by(TaskTemplate.created_at.desc()))
    return [TaskTemplateResponse.model_validate(t) for t in result.scalars()]


@router.post("/task-templates", response_model=TaskTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    data: TaskTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    template = TaskTemplate(
        name=data.name,
        description=data.description,
        tasks_json=data.tasks_json,
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return TaskTemplateResponse.model_validate(template)


@router.delete("/task-templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(TaskTemplate).where(TaskTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    await db.delete(template)
    await db.commit()


@router.post("/phases/{phase_id}/apply-template/{template_id}")
async def apply_template(
    phase_id: str,
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = await db.execute(select(TaskTemplate).where(TaskTemplate.id == template_id))
    template = res.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    phase_res = await db.execute(select(Phase).where(Phase.id == phase_id))
    phase = phase_res.scalar_one_or_none()
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")

    async def insert_tasks_recursive(tasks_list, parent_id=None):
        for t_data in tasks_list:
            task = Task(
                phase_id=phase.id,
                parent_task_id=parent_id,
                name=t_data.get("name"),
                description=t_data.get("description"),
                weight=t_data.get("weight", 1.0),
                estimated_hours=t_data.get("estimated_hours"),
                status="not_started",
                assignee_id=current_user.id,
            )
            db.add(task)
            await db.flush()

            children = t_data.get("children", [])
            if children:
                await insert_tasks_recursive(children, parent_id=task.id)

    tasks_tree = template.tasks_json
    if not isinstance(tasks_tree, list):
        tasks_tree = [tasks_tree]

    await insert_tasks_recursive(tasks_tree)
    await db.commit()
    return {"message": "Template successfully applied", "phase_id": phase_id}
