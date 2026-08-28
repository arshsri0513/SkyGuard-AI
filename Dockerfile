FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ /app/backend/
COPY frontend/ /app/frontend/

ENV PYTHONPATH=/app/backend:$PYTHONPATH

EXPOSE 8000 5500

CMD ["sh", "-c", "python -m http.server 5500 --directory /app/frontend & uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
