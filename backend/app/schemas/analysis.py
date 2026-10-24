from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


Sentiment = Literal["positive", "negative", "neutral"]


class AnalyzeRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    platform: str | None = Field(default=None, max_length=64)
    save: bool = True

    @field_validator("text")
    @classmethod
    def text_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Text must not be empty or whitespace only")
        return value.strip()


class BatchAnalyzeRequest(BaseModel):
    texts: list[str] = Field(min_length=1)
    platform: str | None = Field(default=None, max_length=64)


class Prediction(BaseModel):
    id: str | None
    text: str
    sentiment: Sentiment
    confidence: float
    probabilities: dict[str, float]
    platform: str | None
    created_at: datetime | None


class BatchPrediction(BaseModel):
    items: list[Prediction]
    total: int
    summary: dict[str, int]


class CSVUploadResponse(BaseModel):
    filename: str
    text_column: str
    rows_received: int
    rows_analyzed: int
    rows_skipped: int
    items: list[Prediction]
    summary: dict[str, int]


class PostResponse(BaseModel):
    id: str
    text: str
    sentiment: Sentiment
    confidence: float
    platform: str | None
    created_at: datetime


class PostPage(BaseModel):
    items: list[PostResponse]
    total: int
    page: int
    page_size: int


class DashboardStats(BaseModel):
    total: int
    positive: int
    negative: int
    neutral: int
    positive_percentage: float
    platforms: list[dict[str, int | str]]


class TrendPoint(BaseModel):
    date: str
    positive: int
    negative: int
    neutral: int


class KeywordItem(BaseModel):
    word: str
    count: int
    sentiment: str | None = None


class ModelMetrics(BaseModel):
    algorithm: str
    dataset_size: int
    train_size: int
    test_size: int
    trained_at: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    labels: list[str]
    confusion_matrix: list[list[int]]
    class_distribution: dict[str, int]
    dataset_source: str
    demonstration_data: bool
    methodology: str
