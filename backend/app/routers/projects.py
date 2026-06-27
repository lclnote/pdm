from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.project import Project, ProjectMember
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectMemberCreate, ProjectMemberResponse
from app.services.auth import get_current_user, require_role

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "system_admin":
        result = await db.execute(select(Project).order_by(Project.created_at.desc()))
    else:
        subq = select(ProjectMember.project_id).where(ProjectMember.user_id == current_user.id)
        result = await db.execute(
            select(Project).where(Project.id.in_(subq)).order_by(Project.created_at.desc())
        )
    return [ProjectResponse.model_validate(p) for p in result.scalars()]


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("system_admin", "pm")),
):
    project = Project(
        name=data.name,
        description=data.description,
        start_date=data.start_date,
        end_date=data.end_date,
        progress_calc_method=data.progress_calc_method,
    )
    db.add(project)
    await db.flush()
    member = ProjectMember(
        project_id=project.id,
        user_id=current_user.id,
        role_in_project="pm",
    )
    db.add(member)
    await db.commit()
    await db.refresh(project)
    return ProjectResponse.model_validate(project)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return ProjectResponse.model_validate(project)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if data.name is not None:
        project.name = data.name
    if data.description is not None:
        project.description = data.description
    if data.start_date is not None:
        project.start_date = data.start_date
    if data.end_date is not None:
        project.end_date = data.end_date
    if data.status is not None:
        project.status = data.status
    if data.progress_calc_method is not None:
        project.progress_calc_method = data.progress_calc_method
    await db.commit()
    await db.refresh(project)
    return ProjectResponse.model_validate(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("system_admin")),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    await db.delete(project)
    await db.commit()


@router.get("/{project_id}/members", response_model=list[ProjectMemberResponse])
async def list_members(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProjectMember).where(ProjectMember.project_id == project_id)
    )
    return [ProjectMemberResponse.model_validate(m) for m in result.scalars()]


@router.post("/{project_id}/members", response_model=ProjectMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_member(
    project_id: str,
    data: ProjectMemberCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == data.user_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Member already exists")
    member = ProjectMember(
        project_id=project_id,
        user_id=data.user_id,
        role_in_project=data.role_in_project,
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return ProjectMemberResponse.model_validate(member)


@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    project_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await db.execute(
        delete(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )
    await db.commit()
