import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.deps import get_db
from app.models.life_admin_capture import LifeAdminCapture
from app.models.life_admin_item import LifeAdminItem
from app.models.life_admin_recurrence import LifeAdminRecurrence
from app.models.life_admin_reminder import LifeAdminReminder
from app.models.user import User
from app.schemas.life_admin import (
    LifeAdminCaptureCreate,
    LifeAdminCaptureResponse,
    LifeAdminInsightResponse,
    LifeAdminItemCreate,
    LifeAdminItemResponse,
    LifeAdminItemUpdate,
    LifeAdminRecurrenceCreate,
    LifeAdminRecurrenceResponse,
)
from app.services.life_admin_capture import normalize_life_admin_text
# from app.services.life_admin_insights import get_life_admin_insights
from app.services.life_admin_recurrence import generate_recurring_life_admin_items

router = APIRouter()


@router.post("/items", response_model=LifeAdminItemResponse, status_code=status.HTTP_201_CREATED)
def create_life_admin_item(
    payload: LifeAdminItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LifeAdminItem:
    item = LifeAdminItem(user_id=current_user.id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/items", response_model=list[LifeAdminItemResponse])
def list_life_admin_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[LifeAdminItem]:
    items = db.scalars(
        select(LifeAdminItem)
        .where(LifeAdminItem.user_id == current_user.id)
        .order_by(LifeAdminItem.due_at.asc(), LifeAdminItem.created_at.desc())
    ).all()
    return list(items)


@router.put("/items/{item_id}", response_model=LifeAdminItemResponse)
def update_life_admin_item(
    item_id: int,
    payload: LifeAdminItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LifeAdminItem:
    item = db.scalar(
        select(LifeAdminItem).where(
            LifeAdminItem.id == item_id,
            LifeAdminItem.user_id == current_user.id,
        )
    )
    if not item:
        raise HTTPException(status_code=404, detail="Life admin item not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.post("/recurrences", response_model=LifeAdminRecurrenceResponse, status_code=status.HTTP_201_CREATED)
def create_life_admin_recurrence(
    payload: LifeAdminRecurrenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LifeAdminRecurrence:
    item = db.scalar(
        select(LifeAdminItem).where(
            LifeAdminItem.id == payload.item_id,
            LifeAdminItem.user_id == current_user.id,
        )
    )
    if not item:
        raise HTTPException(status_code=400, detail="Life admin item not found for user")

    recurrence = LifeAdminRecurrence(
        user_id=current_user.id,
        **payload.model_dump(),
    )
    db.add(recurrence)
    db.commit()
    db.refresh(recurrence)
    return recurrence


@router.get("/recurrences", response_model=list[LifeAdminRecurrenceResponse])
def list_life_admin_recurrences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[LifeAdminRecurrence]:
    recurrences = db.scalars(
        select(LifeAdminRecurrence)
        .where(LifeAdminRecurrence.user_id == current_user.id)
        .order_by(LifeAdminRecurrence.created_at.desc())
    ).all()
    return list(recurrences)


@router.post("/capture", response_model=LifeAdminCaptureResponse, status_code=status.HTTP_201_CREATED)
def capture_life_admin_item(
    payload: LifeAdminCaptureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LifeAdminCapture:
    normalized = normalize_life_admin_text(payload.raw_text)

    capture = LifeAdminCapture(
        user_id=current_user.id,
        raw_text=payload.raw_text,
        normalized_payload=json.dumps(normalized),
        status="parsed",
    )
    db.add(capture)
    db.commit()
    db.refresh(capture)

    item = LifeAdminItem(
        user_id=current_user.id,
        item_type=normalized["item_type"],
        title=normalized["title"],
        description=normalized.get("description"),
        priority=normalized["priority"],
        due_at=normalized.get("due_at"),
        source="capture",
    )
    db.add(item)
    db.commit()

    return capture


# @router.get("/insights", response_model=LifeAdminInsightResponse)
# def life_admin_insights(
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user),
# ) -> LifeAdminInsightResponse:
#     payload = get_life_admin_insights(db, current_user)
#     return LifeAdminInsightResponse(**payload)

@router.post("/recurrences/generate", response_model=list[LifeAdminItemResponse], status_code=status.HTTP_201_CREATED)
def generate_life_admin_recurrences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[LifeAdminItem]:
    items = generate_recurring_life_admin_items(db, current_user.id)
    return items