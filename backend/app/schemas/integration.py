from datetime import datetime
from pydantic import BaseModel


class GoogleAuthUrlResponse(BaseModel):
    auth_url: str


class CalendarEventSnapshotResponse(BaseModel):
    id: int
    external_event_id: str
    title: str
    description: str | None
    location: str | None
    start_at: datetime
    end_at: datetime
    source: str
    synced_at: datetime

    class Config:
        from_attributes = True


class GmailActionItemResponse(BaseModel):
    id: int
    gmail_message_id: str
    sender: str | None
    subject: str | None
    snippet: str | None
    extracted_title: str
    extracted_description: str | None
    detected_deadline_at: datetime | None
    status: str
    approval_id: int | None

    class Config:
        from_attributes = True


class IntegrationSyncLogResponse(BaseModel):
    id: int
    integration_type: str
    status: str
    records_processed: int
    error_message: str | None
    started_at: datetime
    finished_at: datetime | None

    class Config:
        from_attributes = True


class PromptRunLogResponse(BaseModel):
    id: int
    feature_name: str
    provider: str
    model: str
    input_tokens: int
    output_tokens: int
    estimated_cost: float
    status: str
    error_message: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class CalendarWriteRequest(BaseModel):
    title: str
    description: str | None = None
    start_at: datetime
    end_at: datetime