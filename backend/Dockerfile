FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN echo '#!/bin/bash' > /start.sh && \
    echo 'set -e' >> /start.sh && \
    echo 'python -c "from app.database import engine, Base; from app.models import user, child, child_transfer, game, assessment, assessment_media, message, report, appointment, mchat; Base.metadata.create_all(bind=engine); print(\"DB tables ready\")"' >> /start.sh && \
    echo 'exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}' >> /start.sh && \
    chmod +x /start.sh

EXPOSE 8000

CMD ["/start.sh"]
