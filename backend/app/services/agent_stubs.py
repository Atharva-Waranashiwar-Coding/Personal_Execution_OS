from datetime import datetime, timedelta

from app.schemas.orchestrator import AgentInput, AgentOutput, CandidateItem


def study_focus_agent(agent_input: AgentInput) -> AgentOutput:
    candidates: list[CandidateItem] = []

    study_tasks = [
        task for task in agent_input.incomplete_tasks
        if "study" in task["title"].lower()
        or "leetcode" in task["title"].lower()
        or "interview" in task["title"].lower()
    ]

    for task in study_tasks[:3]:
        start = None
        end = None
        if task.get("scheduled_for"):
            start = datetime.fromisoformat(task["scheduled_for"])
            end = start + timedelta(minutes=task.get("estimated_minutes") or 60)

        candidates.append(
            CandidateItem(
                source_agent="study_focus_agent",
                item_type="task_execution",
                title=task["title"],
                description=task.get("description"),
                suggested_start_at=start,
                suggested_end_at=end,
                priority_score=8.0 if task["priority"] == "high" else 6.0,
                urgency_score=7.0 if task.get("due_at") else 4.0,
                feasibility_score=7.0,
                reference_type="task",
                reference_id=task["task_id"],
                reasoning="Study-related incomplete task selected for focus.",
            )
        )

    return AgentOutput(
        agent_name="study_focus_agent",
        summary="Selected study-oriented tasks that appear actionable.",
        candidate_items=candidates,
    )


def life_admin_agent(agent_input: AgentInput) -> AgentOutput:
    candidates: list[CandidateItem] = []

    admin_tasks = [
        task for task in agent_input.incomplete_tasks
        if "bill" in task["title"].lower()
        or "email" in task["title"].lower()
        or "follow up" in task["title"].lower()
        or "tax" in task["title"].lower()
    ]

    for task in admin_tasks[:3]:
        candidates.append(
            CandidateItem(
                source_agent="life_admin_agent",
                item_type="task_execution",
                title=task["title"],
                description=task.get("description"),
                priority_score=7.0 if task["priority"] == "high" else 5.0,
                urgency_score=8.0 if task.get("due_at") else 4.0,
                feasibility_score=8.0,
                reference_type="task",
                reference_id=task["task_id"],
                reasoning="Life admin item appears important or deadline-driven.",
            )
        )

    return AgentOutput(
        agent_name="life_admin_agent",
        summary="Selected admin and follow-up related work.",
        candidate_items=candidates,
    )


def health_routine_agent(agent_input: AgentInput) -> AgentOutput:
    candidates: list[CandidateItem] = []

    health_tasks = [
        task for task in agent_input.incomplete_tasks
        if "gym" in task["title"].lower()
        or "workout" in task["title"].lower()
        or "walk" in task["title"].lower()
        or "meal" in task["title"].lower()
    ]

    for task in health_tasks[:2]:
        candidates.append(
            CandidateItem(
                source_agent="health_routine_agent",
                item_type="task_execution",
                title=task["title"],
                description=task.get("description"),
                priority_score=6.0,
                urgency_score=4.0,
                feasibility_score=7.5,
                reference_type="task",
                reference_id=task["task_id"],
                reasoning="Health routine task helps consistency.",
            )
        )

    return AgentOutput(
        agent_name="health_routine_agent",
        summary="Selected routine health and wellness work.",
        candidate_items=candidates,
    )


def job_search_agent(agent_input: AgentInput) -> AgentOutput:
    candidates: list[CandidateItem] = []

    job_tasks = [
        task for task in agent_input.incomplete_tasks
        if "apply" in task["title"].lower()
        or "resume" in task["title"].lower()
        or "recruiter" in task["title"].lower()
        or "job" in task["title"].lower()
    ]

    for task in job_tasks[:3]:
        candidates.append(
            CandidateItem(
                source_agent="job_search_agent",
                item_type="task_execution",
                title=task["title"],
                description=task.get("description"),
                priority_score=8.5 if task["priority"] == "high" else 6.5,
                urgency_score=8.0 if task.get("due_at") else 5.0,
                feasibility_score=7.0,
                reference_type="task",
                reference_id=task["task_id"],
                reasoning="Job search item appears valuable for application pipeline momentum.",
            )
        )

    return AgentOutput(
        agent_name="job_search_agent",
        summary="Selected career and application work.",
        candidate_items=candidates,
    )