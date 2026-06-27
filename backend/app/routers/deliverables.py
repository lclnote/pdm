from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.deliverable import Deliverable, DeliverableReview
from app.models.user import User
from app.schemas.deliverable import DeliverableCreate, DeliverableUpdate, DeliverableResponse, ReviewCreate
from app.services.auth import get_current_user

router = APIRouter(prefix="/api", tags=["deliverables"])


@router.get("/tasks/{task_id}/deliverables", response_model=list[DeliverableResponse])
async def list_deliverables(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Deliverable).where(Deliverable.task_id == task_id)
    )
    return [DeliverableResponse.model_validate(d) for d in result.scalars()]


@router.post("/tasks/{task_id}/deliverables", response_model=DeliverableResponse, status_code=status.HTTP_201_CREATED)
async def create_deliverable(
    task_id: str,
    data: DeliverableCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deliverable = Deliverable(task_id=task_id, status="pending", **data.model_dump())
    db.add(deliverable)
    await db.commit()
    await db.refresh(deliverable)
    return DeliverableResponse.model_validate(deliverable)


@router.put("/deliverables/{deliverable_id}", response_model=DeliverableResponse)
async def update_deliverable(
    deliverable_id: str,
    data: DeliverableUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Deliverable).where(Deliverable.id == deliverable_id))
    d = result.scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deliverable not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(d, field, value)
    await db.commit()
    await db.refresh(d)
    return DeliverableResponse.model_validate(d)


@router.delete("/deliverables/{deliverable_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deliverable(
    deliverable_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Deliverable).where(Deliverable.id == deliverable_id))
    d = result.scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deliverable not found")
    await db.delete(d)
    await db.commit()


@router.post("/deliverables/{deliverable_id}/review")
async def submit_review(
    deliverable_id: str,
    data: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Deliverable).where(Deliverable.id == deliverable_id))
    d = result.scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deliverable not found")
    review = DeliverableReview(
        deliverable_id=deliverable_id,
        reviewer_id=current_user.id,
        status=data.status,
        comment=data.comment,
    )
    db.add(review)
    await db.commit()
    return {"message": "Review submitted", "status": data.status}
