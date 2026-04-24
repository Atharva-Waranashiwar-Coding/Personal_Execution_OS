from datetime import datetime
from pydantic import BaseModel, Field


class AICommandRequest(BaseModel):
    message: str
    context: dict | None = None


class AICommandReviseRequest(BaseModel):
    message: str


class AICommandToolCallResponse(BaseModel):
    id: int
    tool_name: str
    arguments: str | None
    result_payload: str | None
    status: str
    error_message: str | None
    sequence_number: int

    class Config:
        from_attributes = True


class AICommandResponse(BaseModel):
    id: int
    message: str
    intent: str | None
    status: str
    assistant_message: str | None
    extracted_payload: str | None
    created_resources: str | None
    error_message: str | None
    created_at: datetime
    tool_calls: list[AICommandToolCallResponse] = Field(default_factory=list)


class AIIntentPayload(BaseModel):
    intent: str
    confidence: float
    extracted_payload: dict
    assistant_message: str


class ToolExecutionResult(BaseModel):
    tool_name: str
    success: bool
    result: dict
    error_message: str | None = None