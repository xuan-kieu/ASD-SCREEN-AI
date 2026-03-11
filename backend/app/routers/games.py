from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.utils.deps import get_current_user
from app.models.user import User

router = APIRouter()


def row_to_game(r):
    return {
        "id":                      r["id"],
        "code":                    r["code"],
        "name":                    r["name"],
        "description":             r["description"],
        "instructions":            r["instructions"],
        "min_age_months":          r["min_age_months"],
        "max_age_months":          r["max_age_months"],
        "target_duration_seconds": r["target_duration_seconds"],
        "is_gateway":              bool(r["is_gateway"]),
    }


@router.get("/")
def get_all_games(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rows = db.execute(text("""
        SELECT id, code, name, description, instructions,
               min_age_months, max_age_months,
               target_duration_seconds, is_gateway
        FROM games
        ORDER BY min_age_months, id
    """)).mappings().fetchall()
    return [row_to_game(r) for r in rows]


@router.get("/age/{age_months}")
def get_games_by_age(
    age_months: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rows = db.execute(text("""
        SELECT id, code, name, description, instructions,
               min_age_months, max_age_months,
               target_duration_seconds, is_gateway
        FROM games
        WHERE min_age_months <= :age AND max_age_months >= :age
        ORDER BY id
    """), {"age": age_months}).mappings().fetchall()
    return [row_to_game(r) for r in rows]


@router.get("/gateway")
def get_gateway_games(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rows = db.execute(text("""
        SELECT id, code, name, description, instructions,
               min_age_months, max_age_months,
               target_duration_seconds, is_gateway
        FROM games
        WHERE is_gateway = 1
        ORDER BY id
    """)).mappings().fetchall()
    return [row_to_game(r) for r in rows]