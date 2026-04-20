from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.deps import get_db
from app.models.notification_history import NotificationHistory
from app.models.user import User
from app.schemas.notification import NotificationHistoryResponse

router = APIRouter()


@router.get("/history", response_model=list[NotificationHistoryResponse])
def list_notification_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[NotificationHistory]:
    notifications = db.scalars(
        select(NotificationHistory)
        .where(NotificationHistory.user_id == current_user.id)
        .order_by(NotificationHistory.sent_at.desc())
    ).all()
    return list(notifications)