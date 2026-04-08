#!/bin/bash
set -e

echo "=== ASD-SCREEN AI Starting ==="

# Chạy migration PostgreSQL
echo "Running database migration..."
python -c "
from app.database import engine, Base
from app.models import user, child, child_transfer, game, assessment, assessment_media, message
from app.models.user import User
from sqlalchemy import text
import bcrypt

# Tạo tables
Base.metadata.create_all(bind=engine)
print('Tables created')

# Seed admin nếu chưa có
from sqlalchemy.orm import Session
with Session(engine) as db:
    existing = db.query(User).filter(User.username == 'admin').first()
    if not existing:
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(b'Admin@123456', salt).decode('utf-8')
        admin = User(
            username='admin',
            password_hash=hashed,
            full_name='Quản trị viên hệ thống',
            role='admin',
            email='admin@asd-screen.ai'
        )
        db.add(admin)
        db.commit()
        print('Admin user created')
    else:
        print('Admin already exists')

# Seed games nếu chưa có
from app.models.game import Game
with Session(engine) as db:
    count = db.query(Game).count()
    if count == 0:
        games = [
            Game(code='GATEWAY_BALLOON',  name='Gateway: Bong bóng biết bay', min_age_months=12, max_age_months=60, is_gateway=True),
            Game(code='GATEWAY_NAME',     name='Gateway: Bé ơi quay lại nào', min_age_months=12, max_age_months=60, is_gateway=True),
            Game(code='GATEWAY_CLAPPING', name='Gateway: Vỗ tay vui nhộn',    min_age_months=12, max_age_months=60, is_gateway=True),
            Game(code='G1.1', name='Bắt bóng bay',       min_age_months=12, max_age_months=18),
            Game(code='G1.2', name='Vỗ tay theo nhịp',   min_age_months=12, max_age_months=18),
            Game(code='G1.3', name='Gọi tên chú ý',      min_age_months=12, max_age_months=18),
            Game(code='G1.4', name='Ú òa đáng yêu',      min_age_months=12, max_age_months=18),
            Game(code='G1.5', name='Theo dõi đồ chơi',   min_age_months=12, max_age_months=18),
            Game(code='G2.1', name='Chỉ tay tinh mắt',   min_age_months=18, max_age_months=24),
            Game(code='G2.2', name='Xây tháp cao',        min_age_months=18, max_age_months=24),
            Game(code='G2.3', name='Tiếng kêu của ai',   min_age_months=18, max_age_months=24),
            Game(code='G2.4', name='Cho búp bê ăn',      min_age_months=18, max_age_months=24),
            Game(code='G2.5', name='Tìm bóng hình',      min_age_months=18, max_age_months=24),
            Game(code='G3.1', name='Về đúng nhà nào',    min_age_months=24, max_age_months=36),
            Game(code='G3.2', name='Cảm xúc gì đây',     min_age_months=24, max_age_months=36),
            Game(code='G3.3', name='Đến lượt con rồi',   min_age_months=24, max_age_months=36),
            Game(code='G3.4', name='Tìm hình ghép cặp',  min_age_months=24, max_age_months=36),
            Game(code='G3.5', name='Mê cung đơn giản',   min_age_months=24, max_age_months=36),
            Game(code='G4.1', name='Vì sao thế nhỉ',     min_age_months=36, max_age_months=60),
            Game(code='G4.2', name='Sắp xếp câu chuyện', min_age_months=36, max_age_months=60),
            Game(code='G4.3', name='Cửa hàng tí hon',    min_age_months=36, max_age_months=60),
            Game(code='G4.4', name='Làm theo chỉ dẫn',   min_age_months=36, max_age_months=60),
            Game(code='G4.5', name='Giải mã quy tắc',    min_age_months=36, max_age_months=60),
        ]
        db.add_all(games)
        db.commit()
        print(f'Seeded {len(games)} games')
    else:
        print(f'Games already exist: {count}')
"

echo "Migration done. Starting server..."
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
