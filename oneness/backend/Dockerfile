# Oneness FastAPI backend — build context must be oneness/ (the monorepo root)
FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the full oneness package
COPY __init__.py        oneness/__init__.py
COPY models             oneness/models
COPY scoring            oneness/scoring
COPY feedback           oneness/feedback
COPY backend            oneness/backend

ENV PYTHONPATH=/app:/app/oneness/backend

EXPOSE 8000

CMD uvicorn oneness.backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}
