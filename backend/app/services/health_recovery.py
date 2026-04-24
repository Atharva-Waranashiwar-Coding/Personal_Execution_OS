from app.schemas.health import RecoveryLogCreate


def calculate_recovery_score(payload: RecoveryLogCreate) -> int:
    score = 70

    if payload.sleep_hours is not None:
        if payload.sleep_hours >= 8:
            score += 10
        elif payload.sleep_hours >= 6:
            score += 3
        else:
            score -= 15

    if payload.soreness_level is not None:
        if payload.soreness_level >= 8:
            score -= 20
        elif payload.soreness_level >= 5:
            score -= 10

    if payload.stress_level is not None:
        if payload.stress_level >= 8:
            score -= 15
        elif payload.stress_level >= 5:
            score -= 7

    if payload.hydration_level is not None:
        if payload.hydration_level <= 3:
            score -= 12
        elif payload.hydration_level >= 8:
            score += 5

    if payload.energy_level is not None:
        if payload.energy_level >= 8:
            score += 8
        elif payload.energy_level <= 3:
            score -= 12

    return max(0, min(100, score))


def classify_recovery(score: int) -> str:
    if score >= 80:
        return "full_workout"
    if score >= 60:
        return "light_session"
    if score >= 40:
        return "recovery_day"
    return "sleep_correction"