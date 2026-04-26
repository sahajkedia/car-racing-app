FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY oneness/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the full oneness package (backend + sibling packages it imports)
COPY oneness/__init__.py         oneness/__init__.py
COPY oneness/models              oneness/models
COPY oneness/scoring             oneness/scoring
COPY oneness/feedback            oneness/feedback
COPY oneness/backend             oneness/backend

ENV PYTHONPATH=/app

EXPOSE 8000

CMD uvicorn oneness.backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}
