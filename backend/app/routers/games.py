from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.game import Game
from app.schemas import GameResponse
from app.utils.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[GameResponse])
def get_all_games(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Game).all()


@router.get("/age/{age_months}", response_model=List[GameResponse])
def get_games_by_age(
    age_months: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Game).filter(
        Game.min_age_months <= age_months,
        Game.max_age_months >= age_months
    ).all()


@router.get("/gateway", response_model=List[GameResponse])
def get_gateway_games(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Game).filter(Game.is_gateway == True).all()