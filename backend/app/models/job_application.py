from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class JobApplication(Base):
    __tablename__ = "job_applications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False, index=True)
    job_posting_id: Mapped[int] = mapped_column(ForeignKey("job_postings.id"), nullable=False, index=True)
    resume_variant_id: Mapped[int] = mapped_column(ForeignKey("resume_variants.id"), nullable=False, index=True)

    stage: Mapped[str] = mapped_column(String(50), default="applied", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)

    applied_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    last_update_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    fit_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)