"""
routers/audio.py — API nhận audio chunk từ frontend và phân tích real-time
"""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
import uuid, json
from datetime import datetime
from app.database import get_db
from app.models.user import User
from app.utils.deps import get_current_user
from app.services.ai.audio_service import analyze_audio_chunk, aggregate_audio_results

router = APIRouter(prefix="/audio", tags=["Audio"])

# Cache kết quả — dùng Redis nếu có, fallback dict
import os
_redis_client = None
_session_cache: dict = {}

def _get_redis():
    global _redis_client
    if _redis_client is None:
        try:
            import redis
            _redis_client = redis.Redis.from_url(
                os.getenv("REDIS_URL", "redis://asd_redis:6379"),
                decode_responses=True
            )
            _redis_client.ping()
        except Exception:
            _redis_client = False  # Đánh dấu không dùng Redis
    return _redis_client if _redis_client else None

def _cache_append(session_id: str, result: dict):
    r = _get_redis()
    if r:
        import json as _json
        r.rpush(f"audio:{session_id}", _json.dumps(result))
        r.expire(f"audio:{session_id}", 3600)
    else:
        if session_id not in _session_cache:
            _session_cache[session_id] = []
        _session_cache[session_id].append(result)

def _cache_pop(session_id: str) -> list:
    r = _get_redis()
    if r:
        import json as _json
        key = f"audio:{session_id}"
        items = r.lrange(key, 0, -1)
        r.delete(key)
        return [_json.loads(i) for i in items]
    else:
        return _session_cache.pop(session_id, [])

def _cache_len(session_id: str) -> int:
    r = _get_redis()
    if r:
        return r.llen(f"audio:{session_id}")
    return len(_session_cache.get(session_id, []))


@router.post("/analyze")
async def analyze_audio(
    audio: UploadFile = File(...),
    game_session_id: Optional[str] = Form(None),
    game_code: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Nhận 1 chunk audio (5 giây) từ frontend
    Trả về kết quả phân tích ngay lập tức
    """
    # Đọc bytes
    audio_bytes = await audio.read()

    if len(audio_bytes) < 1000:
        raise HTTPException(400, "Audio chunk quá nhỏ")

    # Phân tích
    result = analyze_audio_chunk(audio_bytes)

    # Lưu vào cache (Redis hoặc dict)
    if game_session_id:
        # Verify session thuộc về current_user
        row = db.execute(
            text("""SELECT gs.id FROM game_sessions gs
                    JOIN assessments a ON a.id = gs.assessment_id
                    WHERE gs.id = :id AND a.started_by = :uid"""),
            {"id": game_session_id, "uid": str(current_user.id)}
        ).fetchone()
        if not row:
            raise HTTPException(403, "Không có quyền ghi audio vào session này")
        _cache_append(game_session_id, result)

    return {
        "game_session_id": game_session_id,
        "game_code":       game_code,
        "analysis":        result,
        "chunk_index":     _cache_len(game_session_id) if game_session_id else 0,
    }


@router.post("/session/{game_session_id}/finalize")
async def finalize_session_audio(
    game_session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Kết thúc session → tổng hợp tất cả chunk → lưu vào DB
    Gọi khi game kết thúc
    """
    chunks = _cache_pop(game_session_id)

    if not chunks:
        return {"message": "Không có dữ liệu audio", "summary": None}

    # Tổng hợp
    summary = aggregate_audio_results(chunks)
    summary["chunks_total"] = len(chunks)

    # Lưu vào game_sessions nếu tìm thấy
    try:
        row = db.execute(
            text("SELECT id FROM game_sessions WHERE id = :id"),
            {"id": game_session_id}
        ).fetchone()

        if row:
            # Merge vào raw_features hiện có
            existing = db.execute(
                text("SELECT raw_features FROM game_sessions WHERE id = :id"),
                {"id": game_session_id}
            ).mappings().fetchone()

            features = {}
            if existing and existing["raw_features"]:
                try:
                    features = json.loads(existing["raw_features"])
                except Exception:
                    pass

            features["audio"] = summary

            db.execute(
                text("UPDATE game_sessions SET raw_features = :f WHERE id = :id"),
                {"f": json.dumps(features), "id": game_session_id}
            )
            db.commit()
    except Exception as e:
        print(f"[AUDIO] DB save error: {e}")

    return {
        "game_session_id": game_session_id,
        "chunks_analyzed": len(chunks),
        "summary":         summary,
    }


@router.get("/session/{game_session_id}/summary")
async def get_session_summary(
    game_session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lấy tóm tắt audio của 1 game session từ DB
    """
    row = db.execute(
        text("SELECT raw_features FROM game_sessions WHERE id = :id"),
        {"id": game_session_id}
    ).mappings().fetchone()

    if not row:
        raise HTTPException(404, "Không tìm thấy game session")

    features = {}
    if row["raw_features"]:
        try:
            features = json.loads(row["raw_features"])
        except Exception:
            pass

    audio_summary = features.get("audio")
    if not audio_summary:
        return {"message": "Chưa có dữ liệu audio", "summary": None}

    return {"game_session_id": game_session_id, "summary": audio_summary}

