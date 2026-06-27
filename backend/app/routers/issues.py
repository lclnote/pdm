from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.issue import Issue, IssueComment
from app.models.user import User
from app.schemas.issue import IssueCreate, IssueUpdate, IssueResponse, IssueCommentCreate, IssueCommentResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/api", tags=["issues"])


@router.get("/projects/{project_id}/issues", response_model=list[IssueResponse])
async def list_issues(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Issue).where(Issue.project_id == project_id).order_by(Issue.created_at.desc())
    )
    return [IssueResponse.model_validate(i) for i in result.scalars()]


@router.post("/projects/{project_id}/issues", response_model=IssueResponse, status_code=status.HTTP_201_CREATED)
async def create_issue(
    project_id: str,
    data: IssueCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    issue = Issue(
        project_id=project_id,
        phase_id=data.phase_id,
        task_id=data.task_id,
        risk_id=data.risk_id,
        name=data.name,
        description=data.description,
        type=data.type,
        priority=data.priority,
        reporter_id=current_user.id,
        assignee_id=data.assignee_id,
        due_date=data.due_date,
    )
    db.add(issue)
    await db.commit()
    await db.refresh(issue)
    return IssueResponse.model_validate(issue)


@router.put("/issues/{issue_id}", response_model=IssueResponse)
async def update_issue(
    issue_id: str,
    data: IssueUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Issue).where(Issue.id == issue_id))
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(issue, field, value)
    await db.commit()
    await db.refresh(issue)
    return IssueResponse.model_validate(issue)


@router.delete("/issues/{issue_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_issue(
    issue_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Issue).where(Issue.id == issue_id))
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")
    await db.delete(issue)
    await db.commit()


@router.get("/issues/{issue_id}/comments", response_model=list[IssueCommentResponse])
async def list_comments(
    issue_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(IssueComment).where(IssueComment.issue_id == issue_id).order_by(IssueComment.created_at)
    )
    return [IssueCommentResponse.model_validate(c) for c in result.scalars()]


@router.post("/issues/{issue_id}/comments", response_model=IssueCommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    issue_id: str,
    data: IssueCommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = IssueComment(
        issue_id=issue_id,
        user_id=current_user.id,
        content=data.content,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return IssueCommentResponse.model_validate(comment)
