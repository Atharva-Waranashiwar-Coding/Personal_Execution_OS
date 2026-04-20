from datetime import datetime
from pydantic import BaseModel


class GoalBase(BaseModel):
    title: str
    description: str | None = None
    category: str | None = None
    status: str = "active"
    priority: str = "medium"
    target_date: datetime | None = None


class GoalCreate(GoalBase):
    pass


class GoalUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    status: str | None = None
    priority: str | None = None
    target_date: datetime | None = None
    completed_at: datetime | None = None


class GoalResponse(GoalBase):
    id: int
    user_id: int
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True