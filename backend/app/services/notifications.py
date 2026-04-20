from sqlalchemy.orm import Session

from app.models.notification_history import NotificationHistory


def create_notification(
    db: Session,
    *,
    user_id: int,
    notification_type: str,
    title: str,
    body: str | None = None,
    channel: str = "in_app",
    reference_type: str | None = None,
    reference_id: int | None = None,
) -> NotificationHistory:
    notification = NotificationHistory(
        user_id=user_id,
        channel=channel,
        notification_type=notification_type,
        title=title,
        body=body,
        status="sent",
        reference_type=reference_type,
        reference_id=reference_id,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification