from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from database import get_db
from models import BettingEvent, BettingOption, UserBet, User, BetStatus
from auth import get_current_user, require_admin

router = APIRouter(prefix="/api/betting", tags=["betting"])


class CreateEventRequest(BaseModel):
    title: str
    description: str = ""
    bet_type: str
    deadline: str
    options: list[dict]


class PlaceBetRequest(BaseModel):
    option_id: int
    amount: float


class SettleEventRequest(BaseModel):
    winning_option_id: int


class UpdateEventRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[str] = None
    options: Optional[list[dict]] = None


@router.get("/events")
def list_events(status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(BettingEvent).options(joinedload(BettingEvent.options))
    if status:
        q = q.filter(BettingEvent.status == status)
    events = q.order_by(BettingEvent.deadline.asc()).all()
    return [_event_dict(e) for e in events]


@router.get("/events/{event_id}")
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(BettingEvent).options(
        joinedload(BettingEvent.options),
        joinedload(BettingEvent.user_bets)
    ).filter(BettingEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="投注事件不存在")
    result = _event_dict(event)
    result["bets"] = [
        {
            "id": b.id,
            "user_id": b.user_id,
            "option_id": b.option_id,
            "amount": b.amount,
            "won": b.won,
            "payout": b.payout,
            "placed_at": b.placed_at.isoformat() if b.placed_at else None,
        }
        for b in event.user_bets
    ]
    return result


@router.post("/events")
def create_event(req: CreateEventRequest, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    deadline = datetime.fromisoformat(req.deadline)
    event = BettingEvent(
        title=req.title,
        description=req.description,
        bet_type=req.bet_type,
        deadline=deadline,
    )
    db.add(event)
    db.flush()
    for opt in req.options:
        option = BettingOption(
            event_id=event.id,
            label=opt["label"],
            odds=opt["odds"],
        )
        db.add(option)
    db.commit()
    db.refresh(event)
    return _event_dict(event)


@router.put("/events/{event_id}")
def update_event(event_id: int, req: UpdateEventRequest, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    event = db.query(BettingEvent).filter(BettingEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="投注事件不存在")
    if event.status == BetStatus.SETTLED.value:
        raise HTTPException(status_code=400, detail="已结算的投注不能修改")
    if req.title is not None:
        event.title = req.title
    if req.description is not None:
        event.description = req.description
    if req.deadline is not None:
        event.deadline = datetime.fromisoformat(req.deadline)
    if req.options is not None:
        existing_bets = db.query(UserBet).filter(UserBet.event_id == event_id).count()
        if existing_bets > 0:
            for opt_data in req.options:
                if "id" in opt_data:
                    opt = db.query(BettingOption).filter(BettingOption.id == opt_data["id"]).first()
                    if opt:
                        opt.odds = opt_data["odds"]
                        if "label" in opt_data:
                            opt.label = opt_data["label"]
        else:
            db.query(BettingOption).filter(BettingOption.event_id == event_id).delete()
            for opt_data in req.options:
                option = BettingOption(event_id=event_id, label=opt_data["label"], odds=opt_data["odds"])
                db.add(option)
    db.commit()
    db.refresh(event)
    return _event_dict(event)


@router.post("/events/{event_id}/close")
def close_event(event_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    event = db.query(BettingEvent).filter(BettingEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="投注事件不存在")
    event.status = BetStatus.CLOSED.value
    db.commit()
    return {"message": "投注已关闭"}


@router.post("/events/{event_id}/settle")
def settle_event(event_id: int, req: SettleEventRequest, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    event = db.query(BettingEvent).options(joinedload(BettingEvent.user_bets)).filter(BettingEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="投注事件不存在")

    winning_option = db.query(BettingOption).filter(BettingOption.id == req.winning_option_id).first()
    if not winning_option or winning_option.event_id != event_id:
        raise HTTPException(status_code=400, detail="无效的获胜选项")

    resettled = event.status == BetStatus.SETTLED.value
    if resettled:
        _reverse_settlement(event, db)

    event.status = BetStatus.SETTLED.value
    event.winning_option_id = req.winning_option_id
    event.settled_at = datetime.utcnow()

    for bet in event.user_bets:
        if bet.option_id == req.winning_option_id:
            bet.won = True
            bet.payout = bet.amount * winning_option.odds
            user = db.query(User).filter(User.id == bet.user_id).first()
            user.balance += bet.payout
            _check_auto_repay(user, db)
        else:
            bet.won = False
            bet.payout = 0

    db.commit()
    return {"message": "结果已修改并重新结算" if resettled else "投注已结算"}


@router.delete("/events/{event_id}")
def delete_event(event_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    event = db.query(BettingEvent).options(joinedload(BettingEvent.user_bets)).filter(BettingEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="投注事件不存在")

    # If already settled, undo the payouts first so balances are correct before refunding stakes
    if event.status == BetStatus.SETTLED.value:
        _reverse_settlement(event, db)

    user_bets = db.query(UserBet).filter(UserBet.event_id == event_id).all()
    for bet in user_bets:
        user = db.query(User).filter(User.id == bet.user_id).first()
        user.balance += bet.amount
    db.query(UserBet).filter(UserBet.event_id == event_id).delete()
    db.query(BettingOption).filter(BettingOption.event_id == event_id).delete()
    db.delete(event)
    db.commit()
    return {"message": "投注已删除，下注金额已退还"}


@router.post("/events/{event_id}/bet")
def place_bet(event_id: int, req: PlaceBetRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    event = db.query(BettingEvent).filter(BettingEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="投注事件不存在")
    if event.status != BetStatus.OPEN.value:
        raise HTTPException(status_code=400, detail="投注已关闭")
    if datetime.utcnow() > event.deadline:
        raise HTTPException(status_code=400, detail="投注已截止")

    option = db.query(BettingOption).filter(
        BettingOption.id == req.option_id,
        BettingOption.event_id == event_id
    ).first()
    if not option:
        raise HTTPException(status_code=400, detail="无效的投注选项")

    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="投注金额必须大于0")
    max_bet = user.balance * 0.5
    if req.amount > max_bet:
        raise HTTPException(status_code=400, detail=f"单次投注不能超过余额的50%（最多 {max_bet:.0f}）")
    if req.amount > user.balance:
        raise HTTPException(status_code=400, detail="余额不足")

    user.balance -= req.amount
    bet = UserBet(
        user_id=user.id,
        event_id=event_id,
        option_id=req.option_id,
        amount=req.amount,
    )
    db.add(bet)
    db.commit()
    return {"message": "投注成功", "balance": user.balance}


@router.get("/my-bets")
def my_bets(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bets = db.query(UserBet).options(
        joinedload(UserBet.event),
        joinedload(UserBet.option)
    ).filter(UserBet.user_id == user.id).order_by(UserBet.placed_at.desc()).all()
    return [
        {
            "id": b.id,
            "event_title": b.event.title if b.event else "",
            "event_status": b.event.status if b.event else "",
            "option_label": b.option.label if b.option else "",
            "amount": b.amount,
            "odds": b.option.odds if b.option else 0,
            "won": b.won,
            "payout": b.payout,
            "placed_at": b.placed_at.isoformat() if b.placed_at else None,
        }
        for b in bets
    ]


def _reverse_settlement(event: BettingEvent, db: Session):
    """Undo a settled event's payouts, returning all its bets to the unsettled state.
    Winners' payouts are subtracted back from their balance; losers are untouched.
    Note: loan auto-repay that may have triggered on the original settlement is not
    reconstructed (rare edge case in a virtual-currency game)."""
    for bet in event.user_bets:
        if bet.won and bet.payout:
            user = db.query(User).filter(User.id == bet.user_id).first()
            if user:
                user.balance -= bet.payout
        bet.won = None
        bet.payout = 0.0
    event.winning_option_id = None
    event.settled_at = None


def _check_auto_repay(user: User, db: Session):
    if user.outstanding_loan > 0 and user.balance > 10000:
        repay = min(user.outstanding_loan, user.balance - 10000)
        if repay > 0:
            user.balance -= repay
            user.outstanding_loan -= repay
            from models import LoanRecord
            loan = db.query(LoanRecord).filter(
                LoanRecord.user_id == user.id,
                LoanRecord.repaid == False
            ).first()
            if loan and user.outstanding_loan <= 0:
                loan.repaid = True
                loan.repaid_at = datetime.utcnow()


def _event_dict(event: BettingEvent) -> dict:
    return {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "bet_type": event.bet_type,
        "status": event.status,
        "deadline": event.deadline.isoformat() if event.deadline else None,
        "created_at": event.created_at.isoformat() if event.created_at else None,
        "settled_at": event.settled_at.isoformat() if event.settled_at else None,
        "winning_option_id": event.winning_option_id,
        "options": [
            {"id": o.id, "label": o.label, "odds": o.odds}
            for o in (event.options or [])
        ],
    }
