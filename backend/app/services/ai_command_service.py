import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ai_command import AICommand
from app.models.ai_command_revision import AICommandRevision
from app.models.ai_command_tool_call import AICommandToolCall
from app.models.user import User
from app.services.ai_tool_registry import execute_ai_tool
from app.services.openai_client import classify_ai_command
from app.services.prompt_observability import log_prompt_run


def run_ai_command(
    db: Session,
    user: User,
    message: str,
    context: dict | None = None,
) -> AICommand:
    command = AICommand(
        user_id=user.id,
        message=message,
        status="received",
    )
    db.add(command)
    db.commit()
    db.refresh(command)

    try:
        classification = classify_ai_command(message, context)

        command.intent = classification["intent"]
        command.extracted_payload = json.dumps(classification["extracted_payload"])
        command.assistant_message = classification["assistant_message"]
        command.status = "classified"
        db.commit()
        db.refresh(command)

        log_prompt_run(
            db,
            user_id=user.id,
            feature_name="ai_command_classification",
            prompt=message,
            response=json.dumps(classification),
            input_tokens=max(len(message) // 4, 1),
            output_tokens=max(len(json.dumps(classification)) // 4, 1),
            status="success",
        )

        tool_call = AICommandToolCall(
            command_id=command.id,
            user_id=user.id,
            tool_name=classification["intent"],
            arguments=json.dumps(classification["extracted_payload"]),
            status="running",
            sequence_number=1,
        )
        db.add(tool_call)
        db.commit()
        db.refresh(tool_call)

        result = execute_ai_tool(
            db,
            user,
            classification["intent"],
            classification["extracted_payload"],
        )

        tool_call.status = "success"
        tool_call.result_payload = json.dumps(result)
        command.status = "completed"
        command.created_resources = json.dumps(result)
        command.assistant_message = build_assistant_success_message(classification["intent"], result)

        db.commit()
        db.refresh(command)

        return command

    except Exception as exc:
        command.status = "failed"
        command.error_message = str(exc)

        log_prompt_run(
            db,
            user_id=user.id,
            feature_name="ai_command_classification",
            prompt=message,
            response=None,
            input_tokens=max(len(message) // 4, 1),
            output_tokens=0,
            status="failed",
            error_message=str(exc),
        )

        db.commit()
        db.refresh(command)
        return command


def build_assistant_success_message(intent: str, result: dict) -> str:
    if intent == "study_plan_creation":
        return (
            "I created a study plan with structured topics, subtopics, study sessions, "
            "and a generated execution brief."
        )

    if intent == "health_goal_plan":
        return (
            "I created a practical health plan with workout sessions and a generated execution brief."
        )

    if intent == "life_admin_capture":
        return "I captured the life admin item and included it in your execution plan."

    if intent == "job_search_plan":
        return "I created a job-search related execution plan."

    if intent == "general_execution_plan":
        return "I created a general execution task and generated a plan around it."

    return "I processed your command."


def revise_ai_command(
    db: Session,
    user: User,
    command_id: int,
    revision_message: str,
) -> AICommand:
    command = db.scalar(
        select(AICommand).where(
            AICommand.id == command_id,
            AICommand.user_id == user.id,
        )
    )

    if not command:
        raise ValueError("AI command not found")

    previous_state = {
        "intent": command.intent,
        "extracted_payload": command.extracted_payload,
        "created_resources": command.created_resources,
        "assistant_message": command.assistant_message,
    }

    revised_message = f"""
Original command:
{command.message}

Previous result:
{command.created_resources}

User revision request:
{revision_message}
"""

    revised_command = run_ai_command(
        db,
        user,
        revised_message,
        context=previous_state,
    )

    revision = AICommandRevision(
        command_id=command.id,
        user_id=user.id,
        revision_message=revision_message,
        previous_state=json.dumps(previous_state),
        revised_state=revised_command.created_resources,
    )
    db.add(revision)
    db.commit()

    return revised_command