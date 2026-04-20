from datetime import datetime
from pydantic import BaseModel


class TaskBase(BaseModel):
    title: str
    description: str | None = None
    goal_id: int | None = None
    status: str = "pending"
    priority: str = "medium"
    due_at: datetime | None = None
    scheduled_for: datetime | None = None
    estimated_minutes: int | None = None
    is_recurring: bool = False
    recurrence_rule: str | None = None
    reminder_offset_minutes: int | None = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    goal_id: int | None = None
    status: str | None = None
    priority: str | None = None
    due_at: datetime | None = None
    scheduled_for: datetime | None = None
    estimated_minutes: int | None = None
    is_recurring: bool | None = None
    recurrence_rule: str | None = None
    reminder_offset_minutes: int | None = None
    completed_at: datetime | None = None


class TaskResponse(TaskBase):
    id: int
    user_id: int
    parent_task_id: int | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True