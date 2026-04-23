from datetime import datetime
from pydantic import BaseModel


class LifeAdminItemCreate(BaseModel):
    item_type: str
    title: str
    description: str | None = None
    status: str = "pending"
    priority: str = "medium"
    due_at: datetime | None = None
    scheduled_for: datetime | None = None
    is_recurring_template: bool = False
    reminder_required: bool = True
    source: str = "manual"


class LifeAdminItemUpdate(BaseModel):
    item_type: str | None = None
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    due_at: datetime | None = None
    scheduled_for: datetime | None = None
    completed_at: datetime | None = None
    escalation_level: int | None = None
    reminder_required: bool | None = None


class LifeAdminItemResponse(BaseModel):
    id: int
    user_id: int
    item_type: str
    title: str
    description: str | None
    status: str
    priority: str
    due_at: datetime | None
    scheduled_for: datetime | None
    completed_at: datetime | None
    is_recurring_template: bool
    recurrence_parent_id: int | None
    escalation_level: int
    reminder_required: bool
    source: str

    class Config:
        from_attributes = True


class LifeAdminRecurrenceCreate(BaseModel):
    item_id: int
    recurrence_rule: str
    lead_time_days: int = 3
    next_due_at: datetime | None = None


class LifeAdminRecurrenceResponse(BaseModel):
    id: int
    item_id: int
    user_id: int
    recurrence_rule: str
    lead_time_days: int
    last_generated_at: datetime | None
    next_due_at: datetime | None

    class Config:
        from_attributes = True


class LifeAdminCaptureCreate(BaseModel):
    raw_text: str


class LifeAdminCaptureResponse(BaseModel):
    id: int
    user_id: int
    raw_text: str
    normalized_payload: str | None
    status: str

    class Config:
        from_attributes = True


class LifeAdminInsightResponse(BaseModel):
    urgent_item_count: int
    escalated_item_count: int
    upcoming_bill_count: int
    missed_admin_count: int
    next_admin_item: str | None