from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import User, SystemConfig, UserBet, WeeklySnapshot
from auth import require_super_admin, require_admin, get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/admin", tags=["admin"])


class UpdateUserRequest(BaseModel):
    balance: Optional[float] = None
    role: Optional[str] = None
    outstanding_loan: Optional[float] = None


class SetPhaseRequest(BaseModel):
    phase: str


@router.get("/users")
def list_users(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).all()
    result = []
    for u in users:
        active_bets = db.query(UserBet).filter(UserBet.user_id == u.id, UserBet.won.is_(None)).all()
        active_amount = sum(b.amount for b in active_bets)
        result.append({
            "id": u.id,
            "username": u.username,
            "role": u.role,
            "balance": u.balance,
            "active_bets": active_amount,
            "outstanding_loan": u.outstanding_loan,
            "loans_group_stage": u.loans_group_stage,
            "loans_knockout": u.loans_knockout,
            "total_assets": u.balance + active_amount - u.outstanding_loan,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })
    return result


@router.put("/users/{user_id}")
def update_user(user_id: int, req: UpdateUserRequest, admin: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if req.balance is not None:
        user.balance = req.balance
    if req.role is not None:
        if req.role not in ("admin", "vice_admin", "player"):
            raise HTTPException(status_code=400, detail="无效的角色")
        user.role = req.role
    if req.outstanding_loan is not None:
        user.outstanding_loan = req.outstanding_loan
    db.commit()
    return {"message": "更新成功"}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, admin: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="不能删除管理员账号")
    db.query(UserBet).filter(UserBet.user_id == user_id).delete()
    db.query(WeeklySnapshot).filter(WeeklySnapshot.user_id == user_id).delete()
    db.delete(user)
    db.commit()
    return {"message": "用户已删除"}


@router.get("/phase")
def get_phase(db: Session = Depends(get_db)):
    config = db.query(SystemConfig).filter(SystemConfig.key == "current_phase").first()
    return {"phase": config.value if config else "group"}


@router.post("/phase")
def set_phase(req: SetPhaseRequest, admin: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    if req.phase not in ("group", "knockout"):
        raise HTTPException(status_code=400, detail="无效的阶段")
    config = db.query(SystemConfig).filter(SystemConfig.key == "current_phase").first()
    if config:
        config.value = req.phase
    else:
        config = SystemConfig(key="current_phase", value=req.phase)
        db.add(config)
    db.commit()
    return {"message": f"已切换到{'小组赛' if req.phase == 'group' else '淘汰赛'}阶段"}


@router.post("/weekly-snapshot")
def take_weekly_snapshot(admin: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    users = db.query(User).all()
    for u in users:
        active_bets = db.query(UserBet).filter(UserBet.user_id == u.id, UserBet.won.is_(None)).all()
        active_amount = sum(b.amount for b in active_bets)
        total_value = u.balance + active_amount - u.outstanding_loan
        snapshot = WeeklySnapshot(user_id=u.id, total_value=total_value)
        db.add(snapshot)
    db.commit()
    return {"message": "快照已保存"}
