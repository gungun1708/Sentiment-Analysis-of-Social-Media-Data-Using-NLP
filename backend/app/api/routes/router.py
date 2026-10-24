import csv
import io
import logging
from datetime import date

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.session import get_db
from app.ml.pipeline import LABELS, sentiment_model
from app.models import Analysis
from app.schemas.analysis import (
    AnalyzeRequest,
    BatchAnalyzeRequest,
    BatchPrediction,
    CSVUploadResponse,
    DashboardStats,
    KeywordItem,
    ModelMetrics,
    PostPage,
    Prediction,
    TrendPoint,
)
from app.services.analysis import analyze_text
from app.services.insights import filtered_query, get_keywords

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "model_loaded": sentiment_model.pipeline is not None}


@router.post("/analyze", response_model=Prediction)
def analyze(request: AnalyzeRequest, db: Session = Depends(get_db)) -> dict:
    return analyze_text(db, request.text, request.platform, request.save)


@router.post("/analyze/batch", response_model=BatchPrediction)
def analyze_batch(request: BatchAnalyzeRequest, db: Session = Depends(get_db)) -> dict:
    if len(request.texts) > settings.max_batch_size:
        raise HTTPException(status_code=413, detail=f"Batch exceeds the {settings.max_batch_size} row limit")
    texts = [text.strip() for text in request.texts if text and text.strip()]
    if not texts:
        raise HTTPException(status_code=422, detail="Provide at least one non-empty text")
    if any(len(text) > 5000 for text in texts):
        raise HTTPException(status_code=422, detail="Each text must be 5,000 characters or fewer")
    results = [analyze_text(db, text, request.platform) for text in texts]
    counts = {label: sum(item["sentiment"] == label for item in results) for label in LABELS}
    return {"items": results, "total": len(results), "summary": counts}


@router.post("/upload-csv", response_model=CSVUploadResponse)
async def upload_csv(
    file: UploadFile = File(...),
    text_column: str | None = Query(default=None, max_length=128),
    platform_column: str | None = Query(default=None, max_length=128),
    db: Session = Depends(get_db),
) -> dict:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=415, detail="Upload a .csv file")
    content = await file.read(settings.max_upload_bytes + 1)
    if len(content) > settings.max_upload_bytes:
        maximum_mb = settings.max_upload_bytes / (1024 * 1024)
        raise HTTPException(status_code=413, detail=f"CSV exceeds the {maximum_mb:g} MB upload limit")
    try:
        decoded = content.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(decoded, newline=""), strict=True)
        if not reader.fieldnames or any(not field.strip() for field in reader.fieldnames):
            raise ValueError("CSV must include a header row")
        headers = [field.strip() for field in reader.fieldnames]
        if len(headers) != len(set(headers)):
            raise ValueError("CSV column names must be unique")
        reader.fieldnames = headers
        selected_column = text_column or ("text" if "text" in headers else None)
        if selected_column not in headers:
            raise ValueError(
                f"Text column not found. Choose one of: {', '.join(headers)}"
            )
        if platform_column and platform_column not in headers:
            raise ValueError(f"Platform column '{platform_column}' was not found")
        rows = list(reader)
        if any(None in row for row in rows):
            raise ValueError("CSV rows contain more values than the header")
    except (UnicodeDecodeError, csv.Error, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {exc}") from exc
    if len(rows) > settings.max_batch_size:
        raise HTTPException(status_code=413, detail=f"CSV exceeds the {settings.max_batch_size} row limit")
    valid = [row for row in rows if (row.get(selected_column) or "").strip()]
    if not valid:
        raise HTTPException(status_code=422, detail="No non-empty text rows found in the selected column")
    results = [
        analyze_text(
            db,
            row[selected_column].strip()[:5000],
            (row.get(platform_column) or "").strip() or None if platform_column else None,
            source_metadata=file.filename,
        )
        for row in valid
    ]
    counts = {label: sum(item["sentiment"] == label for item in results) for label in LABELS}
    return {
        "filename": file.filename,
        "text_column": selected_column,
        "rows_received": len(rows),
        "rows_analyzed": len(results),
        "rows_skipped": len(rows) - len(valid),
        "items": results,
        "summary": counts,
    }


@router.get("/dashboard/stats", response_model=DashboardStats)
def dashboard_stats(
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
) -> dict:
    query = filtered_query(db, start_date, end_date)
    grouped = dict(query.with_entities(Analysis.sentiment, func.count()).group_by(Analysis.sentiment).all())
    total = sum(grouped.values())
    platforms = [
        {"platform": platform, "count": count}
        for platform, count in query.with_entities(Analysis.platform, func.count())
        .filter(Analysis.platform.isnot(None))
        .group_by(Analysis.platform)
        .order_by(func.count().desc())
        .all()
    ]
    positive = grouped.get("positive", 0)
    return {
        "total": total,
        "positive": positive,
        "negative": grouped.get("negative", 0),
        "neutral": grouped.get("neutral", 0),
        "positive_percentage": round(positive / total * 100, 1) if total else 0.0,
        "platforms": platforms,
    }


@router.get("/posts", response_model=PostPage)
def list_posts(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=200),
    sentiment: str | None = None,
    platform: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    sort: str = Query(default="newest", pattern="^(newest|oldest|confidence)$"),
    db: Session = Depends(get_db),
) -> dict:
    if sentiment and sentiment not in LABELS:
        raise HTTPException(status_code=422, detail="Sentiment must be positive, negative, or neutral")
    query = filtered_query(db, start_date, end_date)
    if search:
        escaped_search = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        query = query.filter(Analysis.text.ilike(f"%{escaped_search}%", escape="\\"))
    if sentiment:
        query = query.filter(Analysis.sentiment == sentiment)
    if platform:
        query = query.filter(Analysis.platform == platform)
    total = query.count()
    order = {
        "newest": Analysis.created_at.desc(),
        "oldest": Analysis.created_at.asc(),
        "confidence": Analysis.confidence.desc(),
    }[sort]
    items = query.order_by(order).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "items": [
            {
                "id": item.id,
                "text": item.text,
                "sentiment": item.sentiment,
                "confidence": item.confidence,
                "platform": item.platform,
                "created_at": item.created_at,
            }
            for item in items
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/insights/trends", response_model=list[TrendPoint])
def trends(start_date: date | None = None, end_date: date | None = None, db: Session = Depends(get_db)) -> list[dict]:
    rows = (
        filtered_query(db, start_date, end_date)
        .with_entities(func.date(Analysis.created_at), Analysis.sentiment, func.count())
        .group_by(func.date(Analysis.created_at), Analysis.sentiment)
        .order_by(func.date(Analysis.created_at))
        .all()
    )
    grouped: dict[str, dict] = {}
    for day, sentiment, count in rows:
        point = grouped.setdefault(str(day), {"date": str(day), **{label: 0 for label in LABELS}})
        point[sentiment] = count
    return list(grouped.values())


@router.get("/insights/keywords", response_model=list[KeywordItem])
def keywords(
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = Query(default=12, ge=1, le=50),
    sentiment: str | None = None,
    db: Session = Depends(get_db),
) -> list[dict]:
    if sentiment and sentiment not in LABELS:
        raise HTTPException(status_code=422, detail="Sentiment must be positive, negative, or neutral")
    return get_keywords(db, start_date, end_date, limit, sentiment)


@router.get("/model/metrics", response_model=ModelMetrics)
def model_metrics() -> dict:
    try:
        return sentiment_model.get_metrics()
    except (OSError, ValueError) as exc:
        logger.exception("Could not load model metrics")
        raise HTTPException(status_code=503, detail=f"Model metrics unavailable: {exc}") from exc


@router.get("/export/csv")
def export_csv(
    sentiment: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
) -> StreamingResponse:
    if sentiment and sentiment not in LABELS:
        raise HTTPException(status_code=422, detail="Sentiment must be positive, negative, or neutral")
    query = filtered_query(db, start_date, end_date)
    if sentiment:
        query = query.filter(Analysis.sentiment == sentiment)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "text", "sentiment", "confidence", "platform", "created_at"])

    def spreadsheet_safe(value: object) -> str:
        text = str(value) if value is not None else ""
        if text.lstrip(" \t\r\n").startswith(("=", "+", "-", "@")):
            return "'" + text
        return text

    for item in query.order_by(Analysis.created_at.desc()).all():
        writer.writerow([
            item.id,
            spreadsheet_safe(item.text),
            item.sentiment,
            item.confidence,
            spreadsheet_safe(item.platform),
            item.created_at.isoformat(),
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sentiment-analyses.csv"},
    )
