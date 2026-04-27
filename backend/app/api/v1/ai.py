from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.deps import get_db
from app.models.ai_command import AICommand
from app.models.ai_command_tool_call import AICommandToolCall
from app.models.user import User
from app.schemas.ai_command import (
    AICommandRequest,
    AICommandResponse,
    AICommandReviseRequest,
    AICommandToolCallResponse,
)
from app.services.ai_command_service import revise_ai_command, run_ai_command

router = APIRouter()


def build_command_response(db: Session, command: AICommand) -> AICommandResponse:
    tool_calls = db.scalars(
        select(AICommandToolCall)
        .where(AICommandToolCall.command_id == command.id)
        .order_by(AICommandToolCall.sequence_number.asc())
    ).all()

    return AICommandResponse(
        id=command.id,
        message=command.message,
        intent=command.intent,
        status=command.status,
        assistant_message=command.assistant_message,
        extracted_payload=command.extracted_payload,
        created_resources=command.created_resources,
        error_message=command.error_message,
        created_at=command.created_at,
        tool_calls=[
            AICommandToolCallResponse.model_validate(tool_call)
            for tool_call in tool_calls
        ],
    )


@router.post("/command", response_model=AICommandResponse, status_code=status.HTTP_201_CREATED)
def create_ai_command(
    payload: AICommandRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AICommandResponse:
    command = run_ai_command(
        db,
        current_user,
        payload.message,
        payload.context,
    )
    return build_command_response(db, command)


@router.get("/commands", response_model=list[AICommandResponse])
def list_ai_commands(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AICommandResponse]:
    commands = db.scalars(
        select(AICommand)
        .where(AICommand.user_id == current_user.id)
        .order_by(AICommand.created_at.desc())
    ).all()

    return [build_command_response(db, command) for command in commands]


@router.get("/commands/{command_id}", response_model=AICommandResponse)
def get_ai_command(
    command_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AICommandResponse:
    command = db.scalar(
        select(AICommand).where(
            AICommand.id == command_id,
            AICommand.user_id == current_user.id,
        )
    )

    if not command:
        raise HTTPException(status_code=404, detail="AI command not found")

    return build_command_response(db, command)


@router.post("/commands/{command_id}/revise", response_model=AICommandResponse, status_code=status.HTTP_201_CREATED)
def revise_command(
    command_id: int,
    payload: AICommandReviseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AICommandResponse:
    try:
        revised = revise_ai_command(
            db,
            current_user,
            command_id,
            payload.message,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return build_command_response(db, revised)