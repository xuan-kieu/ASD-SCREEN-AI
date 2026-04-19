FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    curl \
    gnupg2 \
    apt-transport-https \
    gcc \
    libpq-dev \
    unixodbc-dev \
    ffmpeg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > /etc/apt/keyrings/microsoft-prod.gpg \
    && chmod 644 /etc/apt/keyrings/microsoft-prod.gpg \
    && curl -fsSL https://packages.microsoft.com/config/debian/12/prod.list > /etc/apt/sources.list.d/microsoft-prod.list \
    && sed -i 's#^deb \\[arch=amd64,arm64,armhf\\]#deb [arch=amd64,arm64,armhf signed-by=/etc/apt/keyrings/microsoft-prod.gpg]#' /etc/apt/sources.list.d/microsoft-prod.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y msodbcsql18 \
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
