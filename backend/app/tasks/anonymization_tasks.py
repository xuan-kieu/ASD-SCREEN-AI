import logging
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

import cv2
import mediapipe as mp
from sqlalchemy import create_engine, text

from app.config import settings
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


def _engine():
    return create_engine(settings.DATABASE_URL, pool_pre_ping=True)


def _resolve_media_path(path_value: str) -> Path:
    p = Path(path_value)
    if p.is_absolute():
        return p
    return Path(settings.MEDIA_ROOT) / p


def _ensure_dirs() -> tuple[Path, Path]:
    root = Path(settings.MEDIA_ROOT)
    orig = root / settings.ORIGINAL_MEDIA_DIR
    anon = root / settings.ANONYMIZED_MEDIA_DIR
    orig.mkdir(parents=True, exist_ok=True)
    anon.mkdir(parents=True, exist_ok=True)
    return orig, anon


def _blur_faces(input_video: Path, output_video_no_audio: Path):
    mp_face = mp.solutions.face_detection
    cap = cv2.VideoCapture(str(input_video))
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {input_video}")

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 640)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 480)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(str(output_video_no_audio), fourcc, fps, (width, height))

    with mp_face.FaceDetection(model_selection=0, min_detection_confidence=0.5) as detector:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = detector.process(rgb)
            if result.detections:
                for det in result.detections:
                    bbox = det.location_data.relative_bounding_box
                    x = max(0, int(bbox.xmin * width))
                    y = max(0, int(bbox.ymin * height))
                    w = min(width - x, int(bbox.width * width))
                    h = min(height - y, int(bbox.height * height))
                    if w > 0 and h > 0:
                        roi = frame[y : y + h, x : x + w]
                        blur = cv2.GaussianBlur(roi, (71, 71), 30)
                        frame[y : y + h, x : x + w] = blur
            out.write(frame)

    cap.release()
    out.release()


def _apply_pitch_shift(input_video: Path, output_video: Path, semitones: float = 2.5):
    # pitch factor from semitones
    factor = 2 ** (semitones / 12.0)
    # Keep duration stable with atempo inverse.
    audio_filter = f"asetrate=44100*{factor},aresample=44100,atempo={1/factor}"
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(input_video),
        "-filter:a",
        audio_filter,
        "-c:v",
        "copy",
        str(output_video),
    ]
    subprocess.run(cmd, check=True, capture_output=True)


@celery_app.task(name="app.tasks.anonymize_assessment_media")
def anonymize_assessment_media(assessment_id: str, child_id: str, meta: Optional[Dict] = None):
    _ensure_dirs()
    with _engine().begin() as conn:
        row = conn.execute(
            text(
                """
                SELECT id, original_video_path
                FROM assessment_media
                WHERE assessment_id = :assessment_id
                ORDER BY created_at DESC
                LIMIT 1
                """
            ),
            {"assessment_id": assessment_id},
        ).mappings().fetchone()

        if not row:
            logger.warning("[ANON_JOB] no media row for assessment_id=%s", assessment_id)
            return {"status": "no_media", "assessment_id": assessment_id}

        media_id = str(row["id"])
        original_path = _resolve_media_path(row["original_video_path"])
        if not original_path.exists():
            conn.execute(
                text("UPDATE assessment_media SET anonymization_status='failed', updated_at=NOW() WHERE id=:id"),
                {"id": media_id},
            )
            return {"status": "original_missing", "media_id": media_id}

        conn.execute(
            text("UPDATE assessment_media SET anonymization_status='processing', updated_at=NOW() WHERE id=:id"),
            {"id": media_id},
        )

    tmp_blurred = original_path.with_name(f"{original_path.stem}.blurred.mp4")
    anonymized_name = f"{assessment_id}_{original_path.stem}.anonymized.mp4"
    anonymized_path = Path(settings.MEDIA_ROOT) / settings.ANONYMIZED_MEDIA_DIR / anonymized_name

    try:
        _blur_faces(original_path, tmp_blurred)
        _apply_pitch_shift(tmp_blurred, anonymized_path)
        try:
            tmp_blurred.unlink(missing_ok=True)
        except Exception:
            pass

        with _engine().begin() as conn:
            conn.execute(
                text(
                    """
                    UPDATE assessment_media
                    SET anonymized_video_path = :anon_path,
                        anonymization_status = 'done',
                        anonymized_at = NOW(),
                        updated_at = NOW()
                    WHERE assessment_id = :assessment_id
                    """
                ),
                {
                    "assessment_id": assessment_id,
                    "anon_path": str(anonymized_path),
                },
            )

        return {
            "status": "done",
            "assessment_id": assessment_id,
            "child_id": child_id,
            "anonymized_video_path": str(anonymized_path),
        }
    except Exception as e:
        with _engine().begin() as conn:
            conn.execute(
                text(
                    "UPDATE assessment_media SET anonymization_status='failed', updated_at=NOW() WHERE assessment_id=:assessment_id"
                ),
                {"assessment_id": assessment_id},
            )
        logger.exception("[ANON_JOB] failed assessment_id=%s error=%s", assessment_id, e)
        return {"status": "failed", "assessment_id": assessment_id, "error": str(e)}


@celery_app.task(name="app.tasks.cleanup_original_media")
def cleanup_original_media():
    cutoff_days = settings.ORIGINAL_RETENTION_DAYS
    deleted_count = 0
    with _engine().begin() as conn:
        rows = conn.execute(
            text(
                """
                SELECT id, original_video_path
                FROM assessment_media
                WHERE original_deleted = false
                  AND delete_original_after IS NOT NULL
                  AND delete_original_after < NOW()
                """
            )
        ).mappings().fetchall()

        for r in rows:
            media_id = str(r["id"])
            p = _resolve_media_path(r["original_video_path"])
            try:
                if p.exists():
                    p.unlink()
                conn.execute(
                    text(
                        """
                        UPDATE assessment_media
                        SET original_deleted = true,
                            anonymization_status = CASE
                              WHEN anonymization_status = 'done' THEN anonymization_status
                              ELSE anonymization_status
                            END,
                            updated_at = NOW()
                        WHERE id = :id
                        """
                    ),
                    {"id": media_id},
                )
                deleted_count += 1
            except Exception as e:
                logger.warning("[CLEANUP] failed delete media_id=%s path=%s err=%s", media_id, p, e)

    return {
        "status": "cleanup_done",
        "retention_days": cutoff_days,
        "deleted_original_files": deleted_count,
        "ran_at": datetime.utcnow().isoformat(),
    }
