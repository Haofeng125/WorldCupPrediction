from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from database import get_db
from models import User, UserBet, WeeklySnapshot

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


def _get_active_bets(user_id: int, db: Session) -> float:
    active_bets = db.query(UserBet).filter(
        UserBet.user_id == user_id,
        UserBet.won.is_(None)
    ).all()
    return sum(b.amount for b in active_bets)


def _get_total_bets(user_id: int, db: Session) -> tuple:
    all_bets = db.query(UserBet).filter(
        UserBet.user_id == user_id,
        UserBet.won.isnot(None)
    ).all()
    total = len(all_bets)
    wins = sum(1 for b in all_bets if b.won)
    return total, wins


def _get_monday_start() -> datetime:
    now = datetime.utcnow()
    monday = now - timedelta(days=now.weekday())
    return monday.replace(hour=0, minute=0, second=0, microsecond=0)


@router.get("/total-assets")
def total_assets(db: Session = Depends(get_db)):
    users = db.query(User).filter(User.id > 0).all()
    result = []
    for u in users:
        active = _get_active_bets(u.id, db)
        net_worth = u.balance + active - u.outstanding_loan
        result.append({
            "id": u.id,
            "username": u.username,
            "balance": u.balance,
            "active_bets": active,
            "outstanding_loan": u.outstanding_loan,
            "total_assets": net_worth,
        })
    result.sort(key=lambda x: x["total_assets"], reverse=True)
    for i, r in enumerate(result):
        r["rank"] = i + 1
    return result


@router.get("/balance")
def balance_board(db: Session = Depends(get_db)):
    users = db.query(User).filter(User.id > 0).all()
    result = []
    for u in users:
        active = _get_active_bets(u.id, db)
        available = u.balance + active
        result.append({
            "id": u.id,
            "username": u.username,
            "balance": u.balance,
            "active_bets": active,
            "available_funds": available,
        })
    result.sort(key=lambda x: x["available_funds"], reverse=True)
    for i, r in enumerate(result):
        r["rank"] = i + 1
    return result


@router.get("/accuracy")
def accuracy_board(db: Session = Depends(get_db)):
    users = db.query(User).filter(User.id > 0).all()
    result = []
    for u in users:
        total, wins = _get_total_bets(u.id, db)
        rate = (wins / total * 100) if total > 0 else 0
        result.append({
            "id": u.id,
            "username": u.username,
            "total_bets": total,
            "wins": wins,
            "accuracy": round(rate, 1),
        })
    result.sort(key=lambda x: x["accuracy"], reverse=True)
    for i, r in enumerate(result):
        r["rank"] = i + 1
    return result


@router.get("/weekly")
def weekly_board(db: Session = Depends(get_db)):
    users = db.query(User).filter(User.id > 0).all()
    monday = _get_monday_start()
    result = []
    for u in users:
        snapshot = db.query(WeeklySnapshot).filter(
            WeeklySnapshot.user_id == u.id,
            WeeklySnapshot.snapshot_at >= monday
        ).order_by(WeeklySnapshot.snapshot_at.asc()).first()

        active = _get_active_bets(u.id, db)
        current_value = u.balance + active - u.outstanding_loan

        if snapshot:
            weekly_gain = current_value - snapshot.total_value
        else:
            weekly_gain = 0

        result.append({
            "id": u.id,
            "username": u.username,
            "weekly_gain": round(weekly_gain, 0),
            "current_value": current_value,
        })
    result.sort(key=lambda x: x["weekly_gain"], reverse=True)
    for i, r in enumerate(result):
        r["rank"] = i + 1
    return result
