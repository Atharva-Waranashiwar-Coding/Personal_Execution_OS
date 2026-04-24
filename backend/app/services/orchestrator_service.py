import json
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.plan_brief import PlanBrief
from app.models.plan_item import PlanItem
from app.models.user import User
from app.services.context_assembler import assemble_agent_input
from app.services.planning_engine import flatten_candidates, resolve_conflicts_and_rank
from app.services.study_focus_agent import run_study_focus_agent
from app.services.life_admin_agent import run_life_admin_agent
from app.services.job_agent import run_job_search_agent
from app.services.health_agent import run_health_routine_agent


def generate_orchestrated_plan(db: Session, user: User) -> tuple[PlanBrief, list[PlanItem]]:
    agent_input = assemble_agent_input(db, user)

    outputs = [
        run_study_focus_agent(db, user, agent_input),
        run_job_search_agent(db, user, agent_input),
        run_health_routine_agent(db, user, agent_input),
        run_life_admin_agent(db, user, agent_input),
    ]

    candidates = flatten_candidates(outputs)
    ranked = resolve_conflicts_and_rank(candidates)

    summary = (
        f"Generated plan with {len(ranked)} prioritized items based on incomplete tasks, "
        f"deadlines, and current constraints."
    )

    planning_notes = " | ".join(output.summary for output in outputs)

    brief = PlanBrief(
        user_id=user.id,
        brief_date=datetime.utcnow(),
        summary=summary,
        context_snapshot=json.dumps(agent_input.model_dump(mode="json")),
        planning_notes=planning_notes,
        created_by="orchestrator",
    )
    db.add(brief)
    db.commit()
    db.refresh(brief)

    created_items: list[PlanItem] = []

    for row in ranked:
        candidate = row["candidate"]
        plan_item = PlanItem(
            brief_id=brief.id,
            user_id=user.id,
            source_agent=candidate.source_agent,
            item_type=candidate.item_type,
            title=candidate.title,
            description=candidate.description,
            recommended_start_at=candidate.suggested_start_at,
            recommended_end_at=candidate.suggested_end_at,
            priority_score=candidate.priority_score,
            urgency_score=candidate.urgency_score,
            feasibility_score=candidate.feasibility_score,
            final_score=row["final_score"],
            rank_position=row["rank_position"],
            status="recommended",
            reference_type=candidate.reference_type,
            reference_id=candidate.reference_id,
            reasoning=candidate.reasoning,
        )
        db.add(plan_item)
        created_items.append(plan_item)

    db.commit()

    for item in created_items:
        db.refresh(item)

    return brief, created_items