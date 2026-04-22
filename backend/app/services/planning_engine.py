from datetime import datetime
from typing import Iterable

from app.schemas.orchestrator import AgentOutput, CandidateItem


def calculate_final_score(item: CandidateItem) -> float:
    return round(
        (item.priority_score * 0.4)
        + (item.urgency_score * 0.35)
        + (item.feasibility_score * 0.25),
        2,
    )


def overlaps(
    start_a: datetime | None,
    end_a: datetime | None,
    start_b: datetime | None,
    end_b: datetime | None,
) -> bool:
    if not start_a or not end_a or not start_b or not end_b:
        return False
    return max(start_a, start_b) < min(end_a, end_b)


def flatten_candidates(outputs: Iterable[AgentOutput]) -> list[CandidateItem]:
    all_items: list[CandidateItem] = []
    for output in outputs:
        all_items.extend(output.candidate_items)
    return all_items


def resolve_conflicts_and_rank(candidates: list[CandidateItem]) -> list[dict]:
    scored = []
    for candidate in candidates:
        scored.append(
            {
                "candidate": candidate,
                "final_score": calculate_final_score(candidate),
            }
        )

    scored.sort(key=lambda item: item["final_score"], reverse=True)

    selected: list[dict] = []

    for item in scored:
        candidate = item["candidate"]
        has_conflict = False

        for existing in selected:
            existing_candidate = existing["candidate"]
            if overlaps(
                candidate.suggested_start_at,
                candidate.suggested_end_at,
                existing_candidate.suggested_start_at,
                existing_candidate.suggested_end_at,
            ):
                has_conflict = True
                break

        if not has_conflict:
            selected.append(item)

    for index, item in enumerate(selected, start=1):
        item["rank_position"] = index

    return selected