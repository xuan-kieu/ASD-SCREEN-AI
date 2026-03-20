FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Tạo startup script
RUN echo '#!/bin/bash\n\
python -c "from app.database import engine, Base; from app.models import user, child, game, assessment, message; Base.metadata.create_all(bind=engine); print(\"DB tables created\")"\n\
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}' > /start.sh \
&& chmod +x /start.sh

CMD ["/start.sh"]
