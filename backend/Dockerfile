FROM python:3.11-slim

WORKDIR /app

# System dependencies (PostgreSQL client, không cần ODBC nữa)
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Script khởi động: tạo bảng DB rồi chạy server
RUN printf '#!/bin/bash\nset -e\necho "⏳ Creating DB tables..."\npython -c "\nfrom app.database import engine, Base\nfrom app.models import user, child, game, assessment, message, report, appointment, mchat\nBase.metadata.create_all(bind=engine)\nprint(\"✅ DB tables ready\")\n"\necho "🚀 Starting server..."\nexec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}\n' > /start.sh \
&& chmod +x /start.sh

EXPOSE 8000

CMD ["/start.sh"]
