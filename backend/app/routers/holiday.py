from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, timedelta

from app.core.database import get_db
from app.models.holiday import Holiday
from app.models.user import User
from app.schemas.holiday import HolidayCreate, HolidayUpdate, HolidayResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/api", tags=["holidays"])


@router.get("/projects/{project_id}/holidays", response_model=list[HolidayResponse])
async def list_holidays(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Holiday).where(Holiday.project_id == project_id).order_by(Holiday.date)
    )
    return [HolidayResponse.model_validate(h) for h in result.scalars()]


@router.post("/projects/{project_id}/holidays", response_model=HolidayResponse, status_code=status.HTTP_201_CREATED)
async def create_holiday(
    project_id: str,
    data: HolidayCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    holiday = Holiday(project_id=project_id, **data.model_dump())
    db.add(holiday)
    await db.commit()
    await db.refresh(holiday)
    return HolidayResponse.model_validate(holiday)


@router.put("/holidays/{holiday_id}", response_model=HolidayResponse)
async def update_holiday(
    holiday_id: str,
    data: HolidayUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Holiday).where(Holiday.id == holiday_id))
    h = result.scalar_one_or_none()
    if not h:
        raise HTTPException(status_code=404, detail="Holiday not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(h, field, value)
    await db.commit()
    await db.refresh(h)
    return HolidayResponse.model_validate(h)


@router.delete("/holidays/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_holiday(
    holiday_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Holiday).where(Holiday.id == holiday_id))
    h = result.scalar_one_or_none()
    if not h:
        raise HTTPException(status_code=404, detail="Holiday not found")
    await db.delete(h)
    await db.commit()


@router.get("/projects/{project_id}/working-days")
async def calculate_working_days(
    project_id: str,
    start: str = "",
    end: str = "",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s = date.fromisoformat(start) if start else date.today()
    e = date.fromisoformat(end) if end else s + timedelta(days=30)

    result = await db.execute(
        select(Holiday).where(Holiday.project_id == project_id)
    )
    holidays = result.scalars().all()
    holiday_dates = {h.date for h in holidays if h.is_working_day == "n"}
    working_override = {h.date for h in holidays if h.is_working_day == "y"}

    total = 0
    working = 0
    d = s
    while d <= e:
        total += 1
        if d in working_override:
            working += 1
        elif d.weekday() < 5 and d not in holiday_dates:
            working += 1
        d += timedelta(days=1)

    return {"start": s.isoformat(), "end": e.isoformat(), "total_days": total, "working_days": working}
