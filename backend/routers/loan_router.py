from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db
from models import User, UserBet, LoanRecord, BetStatus, SystemConfig
from auth import get_current_user

router = APIRouter(prefix="/api/loan", tags=["loan"])

LOAN_AMOUNT = 5000.0
MAX_LOANS_PER_PHASE = 3
BROKE_THRESHOLD = 100.0
AUTO_REPAY_THRESHOLD = 10000.0


def _get_current_phase(db: Session) -> str:
    config = db.query(SystemConfig).filter(SystemConfig.key == "current_phase").first()
    return config.value if config else "group"


def _get_active_bets_amount(user_id: int, db: Session) -> float:
    active_bets = db.query(UserBet).filter(
        UserBet.user_id == user_id,
        UserBet.won.is_(None)
    ).all()
    return sum(b.amount for b in active_bets)


@router.get("/status")
def loan_status(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    phase = _get_current_phase(db)
    active_bets = _get_active_bets_amount(user.id, db)
    total_available = user.balance + active_bets

    if phase == "group":
        loans_used = user.loans_group_stage
    else:
        loans_used = user.loans_knockout

    can_borrow = (
        total_available < BROKE_THRESHOLD
        and user.outstanding_loan <= 0
        and loans_used < MAX_LOANS_PER_PHASE
    )

    return {
        "balance": user.balance,
        "active_bets": active_bets,
        "total_available": total_available,
        "outstanding_loan": user.outstanding_loan,
        "current_phase": phase,
        "loans_used": loans_used,
        "max_loans": MAX_LOANS_PER_PHASE,
        "can_borrow": can_borrow,
        "broke_threshold": BROKE_THRESHOLD,
        "loan_amount": LOAN_AMOUNT,
    }


@router.post("/borrow")
def borrow(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    phase = _get_current_phase(db)
    active_bets = _get_active_bets_amount(user.id, db)
    total_available = user.balance + active_bets

    if total_available >= BROKE_THRESHOLD:
        raise HTTPException(status_code=400, detail=f"你还没有破产（余额+在投金额 >= {BROKE_THRESHOLD:.0f}），无法贷款")

    if user.outstanding_loan > 0:
        raise HTTPException(status_code=400, detail="请先还清上一笔贷款")

    if phase == "group":
        if user.loans_group_stage >= MAX_LOANS_PER_PHASE:
            raise HTTPException(status_code=400, detail="小组赛阶段贷款次数已用完")
        user.loans_group_stage += 1
    else:
        if user.loans_knockout >= MAX_LOANS_PER_PHASE:
            raise HTTPException(status_code=400, detail="淘汰赛阶段贷款次数已用完")
        user.loans_knockout += 1

    user.balance += LOAN_AMOUNT
    user.outstanding_loan = LOAN_AMOUNT

    record = LoanRecord(
        user_id=user.id,
        amount=LOAN_AMOUNT,
        phase=phase,
    )
    db.add(record)
    db.commit()
    return {"message": f"成功借款 {LOAN_AMOUNT:.0f}", "balance": user.balance}


@router.post("/repay")
def repay(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.outstanding_loan <= 0:
        raise HTTPException(status_code=400, detail="没有需要偿还的贷款")
    if user.balance < user.outstanding_loan:
        raise HTTPException(status_code=400, detail=f"余额不足以偿还贷款（需要 {user.outstanding_loan:.0f}）")

    user.balance -= user.outstanding_loan
    user.outstanding_loan = 0

    loan = db.query(LoanRecord).filter(
        LoanRecord.user_id == user.id,
        LoanRecord.repaid == False
    ).first()
    if loan:
        loan.repaid = True
        loan.repaid_at = datetime.utcnow()

    db.commit()
    return {"message": "还款成功", "balance": user.balance}
