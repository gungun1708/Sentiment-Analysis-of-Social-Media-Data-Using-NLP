import os
from pathlib import Path

TEST_DB = Path(__file__).parent / "test_sentiment.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"

from fastapi.testclient import TestClient

from app.database.session import Base, engine
from app.main import app

client = TestClient(app)


def setup_function() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def test_health_endpoint() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_vite_fallback_port_is_allowed_by_cors() -> None:
    response = client.options(
        "/api/analyze",
        headers={
            "Origin": "http://localhost:5174",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5174"


def test_analysis_returns_probabilities_and_persists_record() -> None:
    response = client.post("/api/analyze", json={"text": "I absolutely love this wonderful update"})
    assert response.status_code == 200
    body = response.json()
    assert body["sentiment"] == "positive"
    assert body["id"]
    assert set(body["probabilities"]) == {"positive", "negative", "neutral"}
    assert abs(sum(body["probabilities"].values()) - 1.0) < 0.001
    page = client.get("/api/posts")
    assert page.json()["total"] == 1


def test_empty_and_invalid_requests_are_rejected() -> None:
    assert client.post("/api/analyze", json={"text": "   "}).status_code == 422
    assert client.post("/api/analyze", json={}).status_code == 422


def test_model_can_predict_each_sentiment_class() -> None:
    samples = {
        "positive": "This is excellent, wonderful and absolutely fantastic",
        "negative": "This is awful, terrible and extremely disappointing",
        "neutral": "The meeting starts at four o'clock today",
    }
    for expected, text in samples.items():
        response = client.post("/api/analyze", json={"text": text, "save": False})
        assert response.status_code == 200
        assert response.json()["sentiment"] == expected


def test_batch_analysis_persists_and_returns_summary() -> None:
    response = client.post(
        "/api/analyze/batch",
        json={"texts": ["Wonderful product and service", "Terrible quality and support", "The store opens at nine"]},
    )
    assert response.status_code == 200
    assert response.json()["total"] == 3
    assert sum(response.json()["summary"].values()) == 3
    assert client.get("/api/posts").json()["total"] == 3


def test_csv_upload_and_missing_text_column() -> None:
    content = b"text,platform\nWonderful experience,Social\n,Social\nTerrible service,Forum\n"
    response = client.post("/api/upload-csv", files={"file": ("posts.csv", content, "text/csv")})
    assert response.status_code == 200
    assert response.json()["rows_analyzed"] == 2
    assert response.json()["rows_skipped"] == 1
    assert client.post(
        "/api/upload-csv?text_column=missing",
        files={"file": ("posts.csv", content, "text/csv")},
    ).status_code == 400


def test_dashboard_counts_saved_predictions() -> None:
    client.post("/api/analyze", json={"text": "A wonderful and delightful experience"})
    client.post("/api/analyze", json={"text": "A terrible and disappointing experience"})
    response = client.get("/api/dashboard/stats")
    assert response.status_code == 200
    assert response.json()["total"] == 2
    assert response.json()["positive"] + response.json()["negative"] + response.json()["neutral"] == 2


def test_model_metrics_are_actual_held_out_results() -> None:
    response = client.get("/api/model/metrics")
    assert response.status_code == 200
    metrics = response.json()
    assert metrics["dataset_size"] > 0
    assert metrics["train_size"] + metrics["test_size"] == metrics["dataset_size"]
    assert len(metrics["confusion_matrix"]) == 3
    assert metrics["test_size"] > 0


def test_export_and_search_filters() -> None:
    client.post("/api/analyze", json={"text": "A wonderful result with searchable words"})
    assert client.get("/api/posts", params={"search": "searchable"}).json()["total"] == 1
    response = client.get("/api/export/csv")
    assert response.status_code == 200
    assert "text,sentiment,confidence" in response.text
