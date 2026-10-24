import re
from collections import Counter
from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Analysis

STOPWORDS = {
    "about", "after", "again", "also", "and", "are", "because", "been", "but", "can",
    "could", "did", "does", "for", "from", "had", "has", "have", "her", "here", "him",
    "his", "how", "into", "its", "just", "like", "more", "not", "now", "our", "out",
    "really", "should", "some", "than", "that", "the", "their", "them", "then", "there",
    "these", "they", "this", "those", "through", "very", "was", "were", "what", "when",
    "where", "which", "while", "who", "will", "with", "would", "you", "your",
}


def filtered_query(db: Session, start_date: date | None, end_date: date | None):
    query = db.query(Analysis)
    if start_date:
        query = query.filter(func.date(Analysis.created_at) >= start_date.isoformat())
    if end_date:
        query = query.filter(func.date(Analysis.created_at) <= end_date.isoformat())
    return query


def get_keywords(
    db: Session,
    start_date: date | None,
    end_date: date | None,
    limit: int = 12,
    sentiment: str | None = None,
) -> list[dict]:
    counts: Counter[str] = Counter()
    query = filtered_query(db, start_date, end_date)
    if sentiment:
        query = query.filter(Analysis.sentiment == sentiment)
    for text, in query.with_entities(Analysis.text).all():
        tokens = re.findall(r"[a-zA-Z][a-zA-Z'-]{2,}", text.lower())
        counts.update(token for token in tokens if token not in STOPWORDS)
    return [
        {"word": word, "count": count, "sentiment": sentiment}
        for word, count in counts.most_common(limit)
    ]
