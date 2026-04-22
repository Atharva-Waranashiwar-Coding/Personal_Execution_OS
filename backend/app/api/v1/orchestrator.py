from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.deps import get_db
from app.models.plan_brief import PlanBrief
from app.models.plan_feedback import PlanFeedback
from app.models.plan_item import PlanItem
from app.models.user import User
from app.schemas.orchestrator import (
    GeneratePlanResponse,
    GeneratedPlanItemResponse,
    PlanBriefResponse,
    PlanFeedbackCreate,
    PlanFeedbackResponse,
)
from app.services.orchestrator_service import generate_orchestrated_plan

router = APIRouter()


@router.post("/generate", response_model=GeneratePlanResponse, status_code=status.HTTP_201_CREATED)
def generate_plan(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GeneratePlanResponse:
    brief, items = generate_orchestrated_plan(db, current_user)
    return GeneratePlanResponse(
        brief_id=brief.id,
        summary=brief.summary,
        item_count=len(items),
    )


@router.get("/briefs", response_model=list[PlanBriefResponse])
def list_briefs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PlanBriefResponse]:
    briefs = db.scalars(
        select(PlanBrief)
        .where(PlanBrief.user_id == current_user.id)
        .order_by(PlanBrief.created_at.desc())
    ).all()

    response: list[PlanBriefResponse] = []
    for brief in briefs:
        items = db.scalars(
            select(PlanItem)
            .where(PlanItem.brief_id == brief.id)
            .order_by(PlanItem.rank_position.asc())
        ).all()

        response.append(
            PlanBriefResponse(
                id=brief.id,
                brief_date=brief.brief_date,
                summary=brief.summary,
                context_snapshot=brief.context_snapshot,
                planning_notes=brief.planning_notes,
                created_by=brief.created_by,
                created_at=brief.created_at,
                items=[GeneratedPlanItemResponse.model_validate(item) for item in items],
            )
        )

    return response


@router.get("/briefs/{brief_id}", response_model=PlanBriefResponse)
def get_brief(
    brief_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PlanBriefResponse:
    brief = db.scalar(
        select(PlanBrief).where(PlanBrief.id == brief_id, PlanBrief.user_id == current_user.id)
    )
    if not brief:
        raise HTTPException(status_code=404, detail="Plan brief not found")

    items = db.scalars(
        select(PlanItem)
        .where(PlanItem.brief_id == brief.id)
        .order_by(PlanItem.rank_position.asc())
    ).all()

    return PlanBriefResponse(
        id=brief.id,
        brief_date=brief.brief_date,
        summary=brief.summary,
        context_snapshot=brief.context_snapshot,
        planning_notes=brief.planning_notes,
        created_by=brief.created_by,
        created_at=brief.created_at,
        items=[GeneratedPlanItemResponse.model_validate(item) for item in items],
    )


@router.post("/items/{plan_item_id}/feedback", response_model=PlanFeedbackResponse, status_code=status.HTTP_201_CREATED)
def create_feedback(
    plan_item_id: int,
    payload: PlanFeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PlanFeedback:
    plan_item = db.scalar(
        select(PlanItem).where(PlanItem.id == plan_item_id, PlanItem.user_id == current_user.id)
    )
    if not plan_item:
        raise HTTPException(status_code=404, detail="Plan item not found")

    if payload.feedback_type not in {"useful", "ignored", "unrealistic", "completed"}:
        raise HTTPException(status_code=400, detail="Invalid feedback type")

    feedback = PlanFeedback(
        plan_item_id=plan_item.id,
        user_id=current_user.id,
        feedback_type=payload.feedback_type,
        note=payload.note,
    )
    db.add(feedback)

    if payload.feedback_type == "completed":
        plan_item.status = "completed"
    elif payload.feedback_type == "ignored":
        plan_item.status = "ignored"
    elif payload.feedback_type == "unrealistic":
        plan_item.status = "unrealistic"
    else:
        plan_item.status = "useful"

    db.commit()
    db.refresh(feedback)

    return feedback