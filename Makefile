PYTHON ?= python3.11

.PHONY: install train backend frontend dev test

install:
	$(PYTHON) -m venv backend/.venv
	backend/.venv/bin/python -m pip install -r backend/requirements.txt
	cd frontend && npm install

train:
	cd backend && .venv/bin/python scripts/train_model.py

backend:
	cd backend && .venv/bin/python -m uvicorn app.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

dev:
	@set -e; \
	(cd backend && .venv/bin/python -m uvicorn app.main:app --reload --port 8000) & backend_pid=$$!; \
	(cd frontend && npm run dev) & frontend_pid=$$!; \
	trap 'kill $$backend_pid $$frontend_pid 2>/dev/null || true' INT TERM EXIT; \
	wait

test:
	cd backend && .venv/bin/python -m pytest
	cd frontend && npm run build
