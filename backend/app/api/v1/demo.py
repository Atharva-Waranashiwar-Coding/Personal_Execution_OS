from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.deps import get_db
from app.models.user import User
from app.services.demo_seed import seed_demo_data

router = APIRouter()


@router.post("/seed")
def seed_demo(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    if not settings.DEMO_MODE:
        return {"status": "disabled", "message": "Set DEMO_MODE=true to enable demo seeding"}

    return seed_demo_data(db, current_user)