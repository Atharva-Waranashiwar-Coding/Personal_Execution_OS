from datetime import datetime
from pydantic import BaseModel


class NotificationHistoryResponse(BaseModel):
    id: int
    user_id: int
    channel: str
    notification_type: str
    title: str
    body: str | None
    status: str
    reference_type: str | None
    reference_id: int | None
    sent_at: datetime

    class Config:
        from_attributes = True