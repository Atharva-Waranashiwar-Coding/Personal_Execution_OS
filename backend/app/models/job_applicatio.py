from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class JobApplication(Base):
    __tablename__ = "job_applications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    job_posting_id: Mapped[int] = mapped_column(ForeignKey("job_postings.id"))

    resume_variant_id: Mapped[int] = mapped_column(ForeignKey("resume_variants.id"))

    stage: Mapped[str] = mapped_column(String(50), default="applied")
    status: Mapped[str] = mapped_column(String(50), default="active")

    applied_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_update_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    fit_score: Mapped[float] = mapped_column(default=0.0)
    notes: Mapped[str | None] = mapped_column(Text)