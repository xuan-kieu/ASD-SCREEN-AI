from celery import Celery
from celery.schedules import crontab

from app.config import settings


def _redis_url() -> str:
    return settings.REDIS_URL


broker = settings.CELERY_BROKER_URL or _redis_url()
backend = settings.CELERY_RESULT_BACKEND or _redis_url()

celery_app = Celery("asd_screen_ai", broker=broker, backend=backend)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    beat_schedule={
        "cleanup-original-media-daily": {
            "task": "app.tasks.cleanup_original_media",
            "schedule": crontab(hour=2, minute=0),
        }
    },
)

# Explicit import keeps task registration predictable on the worker.
celery_app.autodiscover_tasks(["app.tasks"])
