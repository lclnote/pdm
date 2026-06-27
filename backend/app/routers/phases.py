from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.phase import Phase
from app.models.project import Project
from app.models.user import User
from app.schemas.phase import PhaseCreate, PhaseUpdate, PhaseResponse, GateRequest
from app.services.auth import get_current_user

router = APIRouter(prefix="/api", tags=["phases"])


@router.get("/projects/{project_id}/phases", response_model=list[PhaseResponse])
async def list_phases(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Phase).where(Phase.project_id == project_id).order_by(Phase.sort_order)
    )
    return [PhaseResponse.model_validate(p) for p in result.scalars()]


@router.post("/projects/{project_id}/phases", response_model=PhaseResponse, status_code=status.HTTP_201_CREATED)
async def create_phase(
    project_id: str,
    data: PhaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    phase = Phase(project_id=project_id, **data.model_dump())
    db.add(phase)
    await db.commit()
    await db.refresh(phase)
    return PhaseResponse.model_validate(phase)


@router.put("/phases/{phase_id}", response_model=PhaseResponse)
async def update_phase(
    phase_id: str,
    data: PhaseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Phase).where(Phase.id == phase_id))
    phase = result.scalar_one_or_none()
    if not phase:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phase not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(phase, field, value)
    await db.commit()
    await db.refresh(phase)
    return PhaseResponse.model_validate(phase)


@router.delete("/phases/{phase_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_phase(
    phase_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Phase).where(Phase.id == phase_id))
    phase = result.scalar_one_or_none()
    if not phase:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phase not found")
    await db.delete(phase)
    await db.commit()


@router.post("/phases/{phase_id}/gate-request")
async def request_gate(
    phase_id: str,
    data: GateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Phase).where(Phase.id == phase_id))
    phase = result.scalar_one_or_none()
    if not phase:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phase not found")
    if phase.status != "active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phase is not active")
    phase.status = "gate_waiting"
    await db.commit()
    return {"message": "Gate request submitted", "phase_id": phase_id}
