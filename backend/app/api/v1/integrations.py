from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.deps import get_db
from app.models.approval import Approval
from app.models.calendar_event_snapshot import CalendarEventSnapshot
from app.models.gmail_action_item import GmailActionItem
from app.models.integration_sync_log import IntegrationSyncLog
from app.models.prompt_run_log import PromptRunLog
from app.models.task import Task
from app.models.user import User
from app.schemas.integration import (
    CalendarEventSnapshotResponse,
    CalendarWriteRequest,
    GmailActionItemResponse,
    GoogleAuthUrlResponse,
    IntegrationSyncLogResponse,
    PromptRunLogResponse,
)
from app.services.gmail_service import sync_gmail_action_items
from app.services.google_calendar_service import (
    create_calendar_event_after_approval,
    sync_calendar_events,
)
from app.services.google_oauth import get_auth_url, save_google_credentials

router = APIRouter()


def google_scopes() -> list[str]:
    return [
        settings.GOOGLE_CALENDAR_READONLY_SCOPE,
        settings.GOOGLE_CALENDAR_EVENTS_SCOPE,
        settings.GMAIL_READONLY_SCOPE,
    ]


@router.get("/google/auth-url", response_model=GoogleAuthUrlResponse)
def get_google_auth_url(
    current_user: User = Depends(get_current_user),
) -> GoogleAuthUrlResponse:
    state = str(current_user.id)
    auth_url = get_auth_url(google_scopes(), state=state)
    return GoogleAuthUrlResponse(auth_url=auth_url)


@router.get("/google/callback")
def google_callback(
    request: Request,
    code: str,
    state: str,
    db: Session = Depends(get_db),
) -> dict:
    user_id = int(state)
    save_google_credentials(
        db=db,
        user_id=user_id,
        scopes=google_scopes(),
        authorization_response_url=str(request.url),
    )
    return {"status": "connected"}


@router.post("/calendar/sync")
def sync_calendar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    count = sync_calendar_events(db, current_user.id, days_ahead=14)
    return {"synced_count": count}


@router.get("/calendar/events", response_model=list[CalendarEventSnapshotResponse])
def list_calendar_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[CalendarEventSnapshot]:
    events = db.scalars(
        select(CalendarEventSnapshot)
        .where(CalendarEventSnapshot.user_id == current_user.id)
        .order_by(CalendarEventSnapshot.start_at.asc())
    ).all()
    return list(events)


@router.post("/calendar/write-request")
def request_calendar_write(
    payload: CalendarWriteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    approval = Approval(
        user_id=current_user.id,
        action_type="create_calendar_event",
        title=f"Create calendar block: {payload.title}",
        description=payload.description,
        status="pending",
        payload=payload.model_dump_json(),
    )
    db.add(approval)
    db.commit()
    db.refresh(approval)
    return {"approval_id": approval.id, "status": "pending_approval"}


@router.post("/calendar/write-approved/{approval_id}")
def write_approved_calendar_event(
    approval_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    approval = db.scalar(
        select(Approval).where(
            Approval.id == approval_id,
            Approval.user_id == current_user.id,
            Approval.action_type == "create_calendar_event",
        )
    )
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")

    if approval.status != "approved":
        raise HTTPException(status_code=400, detail="Approval must be approved before calendar write")

    data = CalendarWriteRequest.model_validate_json(approval.payload)

    event_id = create_calendar_event_after_approval(
        db,
        current_user.id,
        data.title,
        data.description,
        data.start_at,
        data.end_at,
    )

    return {"external_event_id": event_id}


@router.post("/gmail/sync")
def sync_gmail(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    count = sync_gmail_action_items(db, current_user.id, max_results=10)
    return {"extracted_count": count}


@router.get("/gmail/action-items", response_model=list[GmailActionItemResponse])
def list_gmail_action_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[GmailActionItem]:
    items = db.scalars(
        select(GmailActionItem)
        .where(GmailActionItem.user_id == current_user.id)
        .order_by(GmailActionItem.created_at.desc())
    ).all()
    return list(items)


@router.post("/gmail/action-items/{item_id}/create-task")
def create_task_from_gmail_action_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    item = db.scalar(
        select(GmailActionItem).where(
            GmailActionItem.id == item_id,
            GmailActionItem.user_id == current_user.id,
        )
    )
    if not item:
        raise HTTPException(status_code=404, detail="Gmail action item not found")

    approval = db.scalar(
        select(Approval).where(
            Approval.id == item.approval_id,
            Approval.user_id == current_user.id,
        )
    )
    if not approval or approval.status != "approved":
        raise HTTPException(status_code=400, detail="Approval required before creating task")

    task = Task(
        user_id=current_user.id,
        title=item.extracted_title,
        description=item.extracted_description,
        status="pending",
        priority="high" if item.detected_deadline_at else "medium",
        due_at=item.detected_deadline_at,
    )
    db.add(task)

    item.status = "converted_to_task"
    db.commit()
    db.refresh(task)

    return {"task_id": task.id, "status": "created"}


@router.get("/sync-logs", response_model=list[IntegrationSyncLogResponse])
def list_sync_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[IntegrationSyncLog]:
    logs = db.scalars(
        select(IntegrationSyncLog)
        .where(IntegrationSyncLog.user_id == current_user.id)
        .order_by(IntegrationSyncLog.started_at.desc())
    ).all()
    return list(logs)


@router.get("/prompt-logs", response_model=list[PromptRunLogResponse])
def list_prompt_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PromptRunLog]:
    logs = db.scalars(
        select(PromptRunLog)
        .where((PromptRunLog.user_id == current_user.id) | (PromptRunLog.user_id.is_(None)))
        .order_by(PromptRunLog.created_at.desc())
    ).all()
    return list(logs)