from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.prompt_run_log import PromptRunLog


def estimate_llm_cost(input_tokens: int, output_tokens: int) -> float:
    input_cost = (input_tokens / 1000) * settings.LLM_INPUT_COST_PER_1K
    output_cost = (output_tokens / 1000) * settings.LLM_OUTPUT_COST_PER_1K
    return round(input_cost + output_cost, 6)


def log_prompt_run(
    db: Session,
    *,
    user_id: int | None,
    feature_name: str,
    prompt: str,
    response: str | None,
    input_tokens: int,
    output_tokens: int,
    status: str = "success",
    error_message: str | None = None,
) -> PromptRunLog:
    log = PromptRunLog(
        user_id=user_id,
        feature_name=feature_name,
        provider=settings.LLM_PROVIDER,
        model=settings.LLM_MODEL,
        prompt_preview=prompt[:1000],
        response_preview=response[:1000] if response else None,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        estimated_cost=estimate_llm_cost(input_tokens, output_tokens),
        status=status,
        error_message=error_message,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log