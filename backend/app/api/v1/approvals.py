from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.deps import get_db
from app.models.approval import Approval
from app.models.user import User
from app.schemas.approval import ApprovalCreate, ApprovalResolve, ApprovalResponse

router = APIRouter()


@router.post("", response_model=ApprovalResponse, status_code=status.HTTP_201_CREATED)
def create_approval(
    payload: ApprovalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Approval:
    approval = Approval(user_id=current_user.id, **payload.model_dump())
    db.add(approval)
    db.commit()
    db.refresh(approval)
    return approval


@router.get("", response_model=list[ApprovalResponse])
def list_approvals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Approval]:
    approvals = db.scalars(
        select(Approval).where(Approval.user_id == current_user.id).order_by(Approval.created_at.desc())
    ).all()
    return list(approvals)


@router.get("/pending", response_model=list[ApprovalResponse])
def list_pending_approvals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Approval]:
    approvals = db.scalars(
        select(Approval)
        .where(Approval.user_id == current_user.id, Approval.status == "pending")
        .order_by(Approval.created_at.desc())
    ).all()
    return list(approvals)


@router.patch("/{approval_id}/resolve", response_model=ApprovalResponse)
def resolve_approval(
    approval_id: int,
    payload: ApprovalResolve,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Approval:
    approval = db.scalar(
        select(Approval).where(Approval.id == approval_id, Approval.user_id == current_user.id)
    )
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")

    if payload.status not in {"approved", "rejected"}:
        raise HTTPException(status_code=400, detail="Status must be approved or rejected")

    approval.status = payload.status
    approval.resolved_at = datetime.utcnow()

    db.commit()
    db.refresh(approval)
    return approval