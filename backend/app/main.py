from fastapi import FastAPI, Request

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import setup_logging

setup_logging()

app = FastAPI(title=settings.APP_NAME)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    response = await call_next(request)
    return response


app.include_router(api_router, prefix=settings.API_V1_PREFIX)