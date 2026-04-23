from datetime import datetime, timedelta


def normalize_life_admin_text(raw_text: str) -> dict:
    text = raw_text.strip()
    lowered = text.lower()

    item_type = "errand"
    priority = "medium"
    description = None
    due_at = None

    if "bill" in lowered:
        item_type = "bill"
        priority = "high"
    elif "appointment" in lowered or "doctor" in lowered or "dentist" in lowered:
        item_type = "appointment"
        priority = "high"
    elif "document" in lowered or "passport" in lowered or "license" in lowered:
        item_type = "document"
        priority = "high"
    elif "laundry" in lowered or "clean" in lowered or "trash" in lowered or "chore" in lowered:
        item_type = "chore"
    elif "buy" in lowered or "pickup" in lowered or "errand" in lowered:
        item_type = "errand"

    if "tomorrow" in lowered:
        due_at = datetime.utcnow() + timedelta(days=1)
    elif "today" in lowered:
        due_at = datetime.utcnow()
    elif "next week" in lowered:
        due_at = datetime.utcnow() + timedelta(days=7)

    return {
        "item_type": item_type,
        "title": text[:255],
        "description": description,
        "priority": priority,
        "due_at": due_at,
    }