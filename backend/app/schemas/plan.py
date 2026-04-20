from datetime import datetime
from pydantic import BaseModel


class PlanBase(BaseModel):
    plan_type: str = "daily"
    title: str
    content: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    status: str = "draft"
    adherence_status: str | None = None


class PlanCreate(PlanBase):
    pass


class PlanUpdate(BaseModel):
    plan_type: str | None = None
    title: str | None = None
    content: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    status: str | None = None
    adherence_status: str | None = None


class PlanResponse(PlanBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True