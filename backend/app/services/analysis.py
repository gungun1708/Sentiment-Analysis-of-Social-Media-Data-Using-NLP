from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.ml.pipeline import sentiment_model
from app.models import Analysis


def analyze_text(
    db: Session,
    text: str,
    platform: str | None = None,
    save: bool = True,
    source_metadata: str | None = None,
) -> dict:
    sentiment, confidence, probabilities = sentiment_model.predict(text)
    record = None
    if save:
        record = Analysis(
            text=text,
            sentiment=sentiment,
            confidence=confidence,
            platform=platform.strip() if platform and platform.strip() else None,
            source_metadata=source_metadata,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
    return {
        "id": record.id if record else None,
        "text": text,
        "sentiment": sentiment,
        "confidence": confidence,
        "probabilities": probabilities,
        "platform": platform,
        "created_at": record.created_at if record else datetime.now(timezone.utc),
    }
