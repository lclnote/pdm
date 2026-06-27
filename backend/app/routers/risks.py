from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.risk import Risk, RiskCountermeasure
from app.models.user import User
from app.schemas.risk import RiskCreate, RiskUpdate, RiskResponse, RiskCountermeasureCreate, RiskCountermeasureResponse
from app.services.auth import get_current_user
from app.services.state_machine import calculate_priority

router = APIRouter(prefix="/api", tags=["risks"])


@router.get("/projects/{project_id}/risks", response_model=list[RiskResponse])
async def list_risks(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Risk).where(Risk.project_id == project_id).order_by(Risk.created_at.desc())
    )
    return [RiskResponse.model_validate(r) for r in result.scalars()]


@router.post("/projects/{project_id}/risks", response_model=RiskResponse, status_code=status.HTTP_201_CREATED)
async def create_risk(
    project_id: str,
    data: RiskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    risk = Risk(
        project_id=project_id,
        phase_id=data.phase_id,
        task_id=data.task_id,
        name=data.name,
        description=data.description,
        impact=data.impact,
        probability=data.probability,
        priority=calculate_priority(data.impact, data.probability),
    )
    db.add(risk)
    await db.commit()
    await db.refresh(risk)
    return RiskResponse.model_validate(risk)


@router.put("/risks/{risk_id}", response_model=RiskResponse)
async def update_risk(
    risk_id: str,
    data: RiskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Risk).where(Risk.id == risk_id))
    risk = result.scalar_one_or_none()
    if not risk:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risk not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(risk, field, value)
    if data.impact or data.probability:
        risk.priority = calculate_priority(
            data.impact or risk.impact,
            data.probability or risk.probability,
        )
    await db.commit()
    await db.refresh(risk)
    return RiskResponse.model_validate(risk)


@router.delete("/risks/{risk_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_risk(
    risk_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Risk).where(Risk.id == risk_id))
    risk = result.scalar_one_or_none()
    if not risk:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risk not found")
    await db.delete(risk)
    await db.commit()
