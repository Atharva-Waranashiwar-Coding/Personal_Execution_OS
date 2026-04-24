from datetime import datetime

from app.models.job_posting import JobPosting
from app.models.resume_variant import ResumeVariant


def compute_fit_score(posting: JobPosting, resume: ResumeVariant) -> float:
    score = 0.0
    description = (posting.description or "").lower()
    title = (posting.title or "").lower()
    focus_area = resume.focus_area.lower()

    if focus_area in description or focus_area in title:
        score += 25

    backend_keywords = ["fastapi", "python", "sqlalchemy", "postgres", "api", "backend"]
    frontend_keywords = ["react", "next.js", "typescript", "javascript", "frontend"]
    fullstack_keywords = backend_keywords + frontend_keywords
    cloud_keywords = ["aws", "gcp", "docker", "kubernetes", "redis", "celery"]

    if focus_area in {"backend", "backend engineering"}:
        score += sum(5 for keyword in backend_keywords if keyword in description)

    if focus_area in {"frontend", "frontend engineering"}:
        score += sum(5 for keyword in frontend_keywords if keyword in description)

    if focus_area in {"fullstack", "full-stack", "full stack"}:
        score += sum(3 for keyword in fullstack_keywords if keyword in description)

    score += sum(2 for keyword in cloud_keywords if keyword in description)

    location = (posting.location or "").lower()
    if "remote" in location:
        score += 8

    job_type = (posting.job_type or "").lower()
    if job_type in {"full-time", "full time", "contract", "internship", "co-op"}:
        score += 5

    if posting.deadline_at:
        days_left = (posting.deadline_at - datetime.utcnow()).days
        if days_left <= 2:
            score += 10
        elif days_left <= 7:
            score += 6
        elif days_left <= 14:
            score += 3

    return round(min(score, 100), 2)


def build_fit_summary(score: float) -> str:
    if score >= 75:
        return "Strong fit based on role keywords, resume focus, and urgency."
    if score >= 50:
        return "Moderate fit. Worth applying if the role aligns with current goals."
    if score >= 25:
        return "Weak to moderate fit. Consider applying only if strategically useful."
    return "Low fit based on available structured criteria."