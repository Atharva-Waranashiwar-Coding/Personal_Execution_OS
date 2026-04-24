from fastapi import APIRouter

from app.api.v1.analytics import router as analytics_router
from app.api.v1.approvals import router as approvals_router
from app.api.v1.auth import router as auth_router
from app.api.v1.goals import router as goals_router
from app.api.v1.health import router as health_router
from app.api.v1.job import router as job_router
from app.api.v1.life_admin import router as life_admin_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.orchestrator import router as orchestrator_router
from app.api.v1.plans import router as plans_router
from app.api.v1.study import router as study_router
from app.api.v1.tasks import router as tasks_router
from app.api.v1.views import router as views_router
from app.api.v1.health_routine import router as health_routine_router
from app.api.v1.integrations import router as integrations_router
from app.api.v1.final_analytics import router as final_analytics_router
from app.api.v1.demo import router as demo_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(goals_router, prefix="/goals", tags=["goals"])
api_router.include_router(tasks_router, prefix="/tasks", tags=["tasks"])
api_router.include_router(plans_router, prefix="/plans", tags=["plans"])
api_router.include_router(views_router, prefix="/views", tags=["views"])
api_router.include_router(approvals_router, prefix="/approvals", tags=["approvals"])
api_router.include_router(notifications_router, prefix="/notifications", tags=["notifications"])
api_router.include_router(analytics_router, prefix="/analytics", tags=["analytics"])
api_router.include_router(orchestrator_router, prefix="/orchestrator", tags=["orchestrator"])
api_router.include_router(study_router, prefix="/study", tags=["study"])
api_router.include_router(life_admin_router, prefix="/life-admin", tags=["life-admin"])
api_router.include_router(job_router, prefix="/job", tags=["job"])
api_router.include_router(health_routine_router, prefix="/health-routine", tags=["health-routine"])
api_router.include_router(integrations_router, prefix="/integrations", tags=["integrations"])
api_router.include_router(final_analytics_router, prefix="/final-analytics", tags=["final-analytics"])
api_router.include_router(demo_router, prefix="/demo", tags=["demo"])