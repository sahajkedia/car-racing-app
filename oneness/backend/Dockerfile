# Oneness FastAPI backend — minimal Docker image
FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the scoring engine (sibling package)
COPY ../scoring /app/oneness/scoring
COPY ../models  /app/oneness/models
COPY ../feedback /app/oneness/feedback
COPY ../__init__.py /app/oneness/__init__.py
COPY . /app/backend

ENV PYTHONPATH=/app

WORKDIR /app/backend
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
