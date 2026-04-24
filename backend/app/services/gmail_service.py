import base64
from datetime import datetime, timedelta

from googleapiclient.discovery import build
from sqlalchemy.orm import Session
from tenacity import retry, stop_after_attempt, wait_fixed

from app.core.config import settings
from app.models.approval import Approval
from app.models.gmail_action_item import GmailActionItem
from app.models.integration_sync_log import IntegrationSyncLog
from app.services.google_oauth import get_google_credentials


def extract_action_item_from_email(subject: str | None, snippet: str | None) -> dict | None:
    text = f"{subject or ''} {snippet or ''}".lower()

    action_keywords = [
        "deadline",
        "due",
        "please complete",
        "action required",
        "interview",
        "schedule",
        "follow up",
        "submit",
    ]

    if not any(keyword in text for keyword in action_keywords):
        return None

    detected_deadline = None

    if "tomorrow" in text:
        detected_deadline = datetime.utcnow() + timedelta(days=1)
    elif "next week" in text:
        detected_deadline = datetime.utcnow() + timedelta(days=7)

    title = subject or "Email action item"

    return {
        "title": title[:255],
        "description": snippet,
        "detected_deadline_at": detected_deadline,
    }


@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
def sync_gmail_action_items(db: Session, user_id: int, max_results: int = 10) -> int:
    sync_log = IntegrationSyncLog(
        user_id=user_id,
        integration_type="gmail_action_extraction",
        status="running",
    )
    db.add(sync_log)
    db.commit()
    db.refresh(sync_log)

    try:
        credentials = get_google_credentials(
            db,
            user_id,
            [settings.GMAIL_READONLY_SCOPE],
        )

        service = build("gmail", "v1", credentials=credentials)

        result = (
            service.users()
            .messages()
            .list(
                userId="me",
                q="newer_than:14d",
                maxResults=max_results,
            )
            .execute()
        )

        messages = result.get("messages", [])
        created_count = 0

        for message in messages:
            message_id = message["id"]
            full_message = service.users().messages().get(userId="me", id=message_id).execute()

            headers = full_message.get("payload", {}).get("headers", [])
            subject = next((h["value"] for h in headers if h["name"].lower() == "subject"), None)
            sender = next((h["value"] for h in headers if h["name"].lower() == "from"), None)
            snippet = full_message.get("snippet")

            extracted = extract_action_item_from_email(subject, snippet)
            if not extracted:
                continue

            approval = Approval(
                user_id=user_id,
                action_type="create_task_from_gmail",
                title=f"Create task from email: {extracted['title']}",
                description=extracted.get("description"),
                status="pending",
                payload=str(
                    {
                        "gmail_message_id": message_id,
                        "title": extracted["title"],
                        "description": extracted.get("description"),
                        "detected_deadline_at": str(extracted.get("detected_deadline_at")),
                    }
                ),
            )
            db.add(approval)
            db.commit()
            db.refresh(approval)

            item = GmailActionItem(
                user_id=user_id,
                gmail_message_id=message_id,
                sender=sender,
                subject=subject,
                snippet=snippet,
                extracted_title=extracted["title"],
                extracted_description=extracted.get("description"),
                detected_deadline_at=extracted.get("detected_deadline_at"),
                status="pending_approval",
                approval_id=approval.id,
            )
            db.add(item)
            db.commit()
            created_count += 1

        sync_log.status = "success"
        sync_log.records_processed = created_count
        sync_log.finished_at = datetime.utcnow()
        db.commit()

        return created_count

    except Exception as exc:
        sync_log.status = "failed"
        sync_log.error_message = str(exc)
        sync_log.finished_at = datetime.utcnow()
        db.commit()
        raise