from datetime import datetime
from pydantic import BaseModel


class ApprovalCreate(BaseModel):
    action_type: str
    title: str
    description: str | None = None
    payload: str | None = None


class ApprovalResolve(BaseModel):
    status: str


class ApprovalResponse(BaseModel):
    id: int
    user_id: int
    action_type: str
    title: str
    description: str | None
    status: str
    payload: str | None
    resolved_at: datetime | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True