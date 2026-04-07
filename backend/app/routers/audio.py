"""
routers/audio.py — API nhận audio chunk từ frontend và phân tích real-time
"""
import json
import logging
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from app.database import get_db
from app.models.user import User
from app.utils.deps import get_current_user
from app.services.ai.audio_service import analyze_audio_chunk, aggregate_audio_results

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/audio", tags=["Audio"])

# Cache kết quả trong memory theo session_id
# { session_id: [result1, result2, ...] }
_session_cache: dict = {}


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

    # Lưu vào cache theo session
    if game_session_id:
        if game_session_id not in _session_cache:
            _session_cache[game_session_id] = []
        _session_cache[game_session_id].append(result)

        # Giới hạn cache 50 chunk / session
        if len(_session_cache[game_session_id]) > 50:
            _session_cache[game_session_id] = _session_cache[game_session_id][-50:]

    return {
        "game_session_id": game_session_id,
        "game_code":       game_code,
        "analysis":        result,
        "chunk_index":     len(_session_cache.get(game_session_id, [])),
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
    chunks = _session_cache.pop(game_session_id, [])

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
                except (json.JSONDecodeError, ValueError) as e:
                    logger.warning(f"[AUDIO] Không parse được raw_features: {e}")

            features["audio"] = summary

            db.execute(
                text("UPDATE game_sessions SET raw_features = :f WHERE id = :id"),
                {"f": json.dumps(features), "id": game_session_id}
            )
            db.commit()
    except Exception as e:
        logger.error(f"[AUDIO] DB save error: {e}", exc_info=True)
        db.rollback()

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
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"[AUDIO] Không parse được raw_features trong summary: {e}")

    audio_summary = features.get("audio")
    if not audio_summary:
        return {"message": "Chưa có dữ liệu audio", "summary": None}

    return {"game_session_id": game_session_id, "summary": audio_summary}