from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task


async def calculate_project_progress(project_id, method: str, db: AsyncSession) -> float:
    leaf_tasks = await db.execute(
        select(Task).where(
            Task.project_id == project_id,
            Task.id.not_in(
                select(Task.parent_task_id).where(Task.parent_task_id.isnot(None))
            ),
        )
    )
    leaves = leaf_tasks.scalars().all()
    if not leaves:
        return 0.0

    if method == "task_count":
        completed = sum(1 for t in leaves if t.status == "completed")
        weighted = sum(t.weight for t in leaves if t.status == "completed")
        total_weight = sum(t.weight for t in leaves)
        return (weighted / total_weight * 100) if total_weight > 0 else 0.0
    else:
        total_estimated = sum(float(t.estimated_hours) for t in leaves)
        total_actual = sum(
            float(t.actual_hours) if t.actual_hours else float(t.estimated_hours)
            for t in leaves if t.status == "completed"
        )
        return (total_actual / total_estimated * 100) if total_estimated > 0 else 0.0
