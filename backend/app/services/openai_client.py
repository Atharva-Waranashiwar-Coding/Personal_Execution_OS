import json

from openai import OpenAI

from app.core.config import settings


def get_openai_client() -> OpenAI:
    if not settings.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is missing")
    return OpenAI(api_key=settings.OPENAI_API_KEY)


def classify_ai_command(message: str, context: dict | None = None) -> dict:
    client = get_openai_client()

    schema = {
        "name": "ai_command_intent",
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "intent": {
                    "type": "string",
                    "enum": [
                        "study_plan_creation",
                        "health_goal_plan",
                        "job_search_plan",
                        "life_admin_capture",
                        "general_execution_plan",
                        "unknown",
                    ],
                },
                "confidence": {"type": "number"},
                "extracted_payload": {
                    "type": "object",
                    "additionalProperties": True,
                    "properties": {
                        "topic": {"type": ["string", "null"]},
                        "deadline": {"type": ["string", "null"]},
                        "goal": {"type": ["string", "null"]},
                        "timeline": {"type": ["string", "null"]},
                        "constraints": {"type": ["string", "null"]},
                        "available_time": {"type": ["string", "null"]},
                        "target_role": {"type": ["string", "null"]},
                        "company": {"type": ["string", "null"]},
                    },
                },
                "assistant_message": {"type": "string"},
            },
            "required": ["intent", "confidence", "extracted_payload", "assistant_message"],
        },
        "strict": True,
    }

    prompt = f"""
You are the AI command router for Personal Execution OS.

Classify the user's command into one intent.

Available intents:
- study_plan_creation
- health_goal_plan
- job_search_plan
- life_admin_capture
- general_execution_plan
- unknown

Extract useful fields like topic, deadline, goal, timeline, constraints, available_time, target_role, and company.

User message:
{message}

Additional context:
{json.dumps(context or {})}
"""

    response = client.responses.create(
        model=settings.OPENAI_MODEL,
        input=prompt,
        text={
            "format": {
                "type": "json_schema",
                "name": schema["name"],
                "schema": schema["schema"],
                "strict": True,
            }
        },
    )

    raw_text = response.output_text
    return json.loads(raw_text)