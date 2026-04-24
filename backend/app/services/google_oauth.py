from datetime import datetime
from typing import Iterable

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.google_integration import GoogleIntegration


def build_google_flow(scopes: list[str]) -> Flow:
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET or not settings.GOOGLE_REDIRECT_URI:
        raise ValueError("Google OAuth environment variables are missing")

    client_config = {
        "web": {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
        }
    }

    return Flow.from_client_config(
        client_config,
        scopes=scopes,
        redirect_uri=settings.GOOGLE_REDIRECT_URI,
    )


def get_auth_url(scopes: list[str], state: str) -> str:
    flow = build_google_flow(scopes)
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=state,
    )
    return auth_url


def save_google_credentials(
    db: Session,
    user_id: int,
    scopes: list[str],
    authorization_response_url: str,
) -> GoogleIntegration:
    flow = build_google_flow(scopes)
    flow.fetch_token(authorization_response=authorization_response_url)

    credentials = flow.credentials

    existing = db.scalar(
        select(GoogleIntegration).where(GoogleIntegration.user_id == user_id)
    )

    if existing:
        existing.scopes = " ".join(scopes)
        existing.access_token = credentials.token
        existing.refresh_token = credentials.refresh_token or existing.refresh_token
        existing.token_uri = credentials.token_uri
        existing.expiry = credentials.expiry
        existing.status = "active"
        db.commit()
        db.refresh(existing)
        return existing

    integration = GoogleIntegration(
        user_id=user_id,
        scopes=" ".join(scopes),
        access_token=credentials.token,
        refresh_token=credentials.refresh_token,
        token_uri=credentials.token_uri,
        expiry=credentials.expiry,
        status="active",
    )
    db.add(integration)
    db.commit()
    db.refresh(integration)
    return integration


def get_google_credentials(db: Session, user_id: int, required_scopes: Iterable[str]) -> Credentials:
    integration = db.scalar(
        select(GoogleIntegration).where(
            GoogleIntegration.user_id == user_id,
            GoogleIntegration.status == "active",
        )
    )

    if not integration:
        raise ValueError("Google integration not connected")

    saved_scopes = set(integration.scopes.split())
    required = set(required_scopes)

    if not required.issubset(saved_scopes):
        raise ValueError("Google integration does not have required scopes")

    return Credentials(
        token=integration.access_token,
        refresh_token=integration.refresh_token,
        token_uri=integration.token_uri or "https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        scopes=list(saved_scopes),
    )