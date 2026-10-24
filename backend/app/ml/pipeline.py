import json
import logging
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from nltk.tokenize import TweetTokenizer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from app.core.config import settings

logger = logging.getLogger(__name__)
LABELS = ["negative", "neutral", "positive"]
URL_RE = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)
MENTION_RE = re.compile(r"(?<!\w)@\w+")
WHITESPACE_RE = re.compile(r"\s+")
TOKENIZER = TweetTokenizer(preserve_case=False, reduce_len=True, strip_handles=False)


def _describe_symbols(text: str) -> str:
    described: list[str] = []
    for character in text:
        if unicodedata.category(character) == "So":
            name = unicodedata.name(character, "")
            described.append(f" {name.lower()} " if name else " ")
        else:
            described.append(character)
    return "".join(described)


def clean_text(text: str) -> str:
    value = URL_RE.sub(" URL ", text)
    value = MENTION_RE.sub(" USER ", value)
    value = re.sub(r"#(\w+)", r"\1", value)
    value = _describe_symbols(value)
    value = WHITESPACE_RE.sub(" ", value).strip()
    return " ".join(TOKENIZER.tokenize(value)) or " "


def load_dataset(path: str | Path) -> pd.DataFrame:
    dataset = pd.read_csv(path)
    required = {"text", "sentiment"}
    if not required.issubset(dataset.columns):
        raise ValueError("Training CSV must contain 'text' and 'sentiment' columns")
    dataset = dataset.dropna(subset=["text", "sentiment"]).copy()
    dataset["text"] = dataset["text"].astype(str).str.strip()
    dataset["sentiment"] = dataset["sentiment"].astype(str).str.strip().str.lower()
    dataset = dataset[dataset["text"].ne("") & dataset["sentiment"].isin(LABELS)]
    if len(dataset) < 6 or dataset["sentiment"].nunique() != 3:
        raise ValueError("Training data must contain at least six rows across all three sentiment classes")
    if dataset["sentiment"].value_counts().min() < 2:
        raise ValueError("Each sentiment class must contain at least two examples")
    test_size = (len(dataset) + 3) // 4
    if test_size < 3 or len(dataset) - test_size < 3:
        raise ValueError("Training data must contain enough rows for a stratified train/test split")
    return dataset


def train_and_save(data_path: str | Path | None = None) -> dict[str, Any]:
    source = Path(data_path or settings.demo_data_path).resolve()
    dataset = load_dataset(source)
    features = dataset["text"]
    labels = dataset["sentiment"]
    x_train, x_test, y_train, y_test = train_test_split(
        features,
        labels,
        test_size=0.25,
        random_state=42,
        stratify=labels,
    )
    pipeline = Pipeline(
        [
            ("tfidf", TfidfVectorizer(
                preprocessor=clean_text,
                lowercase=True,
                ngram_range=(1, 2),
                sublinear_tf=True,
                token_pattern=r"(?u)\b\w+\b",
                strip_accents="unicode",
            )),
            ("classifier", LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42)),
        ]
    )
    pipeline.fit(x_train, y_train)
    predicted = pipeline.predict(x_test)
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_test, predicted, labels=LABELS, average="weighted", zero_division=0
    )
    metrics: dict[str, Any] = {
        "algorithm": "TF-IDF (unigrams + bigrams) + Logistic Regression",
        "dataset_size": len(dataset),
        "train_size": len(x_train),
        "test_size": len(x_test),
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "accuracy": float(accuracy_score(y_test, predicted)),
        "precision": float(precision),
        "recall": float(recall),
        "f1_score": float(f1),
        "labels": LABELS,
        "confusion_matrix": confusion_matrix(y_test, predicted, labels=LABELS).tolist(),
        "class_distribution": {str(k): int(v) for k, v in dataset["sentiment"].value_counts().items()},
        "dataset_source": source.name,
        "demonstration_data": source == Path(settings.demo_data_path).resolve(),
        "methodology": "Reproducible stratified 75/25 train/test split (random_state=42); metrics are measured only on the held-out test split.",
    }
    model_path = Path(settings.model_path)
    metrics_path = Path(settings.metrics_path)
    model_path.parent.mkdir(parents=True, exist_ok=True)
    metrics_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, model_path)
    metrics_path.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    logger.info("Trained sentiment model on %d examples; held-out accuracy %.3f", len(dataset), metrics["accuracy"])
    return metrics


class SentimentModel:
    def __init__(self) -> None:
        self.pipeline: Pipeline | None = None
        self.metrics: dict[str, Any] | None = None

    def load(self) -> None:
        model_path = Path(settings.model_path)
        metrics_path = Path(settings.metrics_path)
        if not model_path.exists() or not metrics_path.exists():
            train_and_save()
        self.pipeline = joblib.load(model_path)
        self.metrics = json.loads(metrics_path.read_text(encoding="utf-8"))

    def predict(self, text: str) -> tuple[str, float, dict[str, float]]:
        if self.pipeline is None:
            self.load()
        assert self.pipeline is not None
        probabilities = self.pipeline.predict_proba([text])[0]
        classes = self.pipeline.named_steps["classifier"].classes_
        probability_map = {str(label): float(score) for label, score in zip(classes, probabilities)}
        sentiment = max(probability_map, key=probability_map.get)
        return sentiment, probability_map[sentiment], {
            label: probability_map.get(label, 0.0) for label in LABELS
        }

    def get_metrics(self) -> dict[str, Any]:
        if self.metrics is None:
            self.load()
        assert self.metrics is not None
        return self.metrics


sentiment_model = SentimentModel()
