import json
from datetime import datetime, timedelta

from googleapiclient.discovery import build
from sqlalchemy import select
from sqlalchemy.orm import Session
from tenacity import retry, stop_after_attempt, wait_fixed

from app.core.config import settings
from app.models.calendar_event_snapshot import CalendarEventSnapshot
from app.models.integration_sync_log import IntegrationSyncLog
from app.services.google_oauth import get_google_credentials


def parse_google_datetime(value: dict) -> datetime:
    raw = value.get("dateTime") or value.get("date")
    if raw.endswith("Z"):
        raw = raw.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(raw)
    return parsed.replace(tzinfo=None)


@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
def sync_calendar_events(db: Session, user_id: int, days_ahead: int = 7) -> int:
    sync_log = IntegrationSyncLog(
        user_id=user_id,
        integration_type="google_calendar_read",
        status="running",
    )
    db.add(sync_log)
    db.commit()
    db.refresh(sync_log)

    try:
        credentials = get_google_credentials(
            db,
            user_id,
            [settings.GOOGLE_CALENDAR_READONLY_SCOPE],
        )

        service = build("calendar", "v3", credentials=credentials)

        now = datetime.utcnow()
        time_min = now.isoformat() + "Z"
        time_max = (now + timedelta(days=days_ahead)).isoformat() + "Z"

        result = (
            service.events()
            .list(
                calendarId="primary",
                timeMin=time_min,
                timeMax=time_max,
                singleEvents=True,
                orderBy="startTime",
            )
            .execute()
        )

        events = result.get("items", [])
        processed = 0

        for event in events:
            event_id = event["id"]
            start_at = parse_google_datetime(event["start"])
            end_at = parse_google_datetime(event["end"])

            existing = db.scalar(
                select(CalendarEventSnapshot).where(
                    CalendarEventSnapshot.user_id == user_id,
                    CalendarEventSnapshot.external_event_id == event_id,
                )
            )

            if existing:
                existing.title = event.get("summary", "Untitled event")
                existing.description = event.get("description")
                existing.location = event.get("location")
                existing.start_at = start_at
                existing.end_at = end_at
                existing.raw_payload = json.dumps(event)
                existing.synced_at = datetime.utcnow()
            else:
                snapshot = CalendarEventSnapshot(
                    user_id=user_id,
                    external_event_id=event_id,
                    title=event.get("summary", "Untitled event"),
                    description=event.get("description"),
                    location=event.get("location"),
                    start_at=start_at,
                    end_at=end_at,
                    raw_payload=json.dumps(event),
                )
                db.add(snapshot)

            processed += 1

        sync_log.status = "success"
        sync_log.records_processed = processed
        sync_log.finished_at = datetime.utcnow()
        db.commit()

        return processed

    except Exception as exc:
        sync_log.status = "failed"
        sync_log.error_message = str(exc)
        sync_log.finished_at = datetime.utcnow()
        db.commit()
        raise


@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
def create_calendar_event_after_approval(
    db: Session,
    user_id: int,
    title: str,
    description: str | None,
    start_at: datetime,
    end_at: datetime,
) -> str:
    credentials = get_google_credentials(
        db,
        user_id,
        [
            settings.GOOGLE_CALENDAR_READONLY_SCOPE,
            settings.GOOGLE_CALENDAR_EVENTS_SCOPE,
        ],
    )

    service = build("calendar", "v3", credentials=credentials)

    body = {
        "summary": title,
        "description": description,
        "start": {"dateTime": start_at.isoformat()},
        "end": {"dateTime": end_at.isoformat()},
    }

    event = service.events().insert(calendarId="primary", body=body).execute()
    return event["id"]