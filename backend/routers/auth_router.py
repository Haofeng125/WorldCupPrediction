from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import User
from auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

INVITATION_CODE = "302"


class RegisterRequest(BaseModel):
    username: str
    password: str
    password_confirm: str
    invitation_code: str


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if req.invitation_code != INVITATION_CODE:
        raise HTTPException(status_code=400, detail="邀请码错误")
    if req.password != req.password_confirm:
        raise HTTPException(status_code=400, detail="两次密码不一致")
    if len(req.username) < 1 or len(req.username) > 20:
        raise HTTPException(status_code=400, detail="用户名长度需在1-20个字符之间")
    if len(req.password) < 4:
        raise HTTPException(status_code=400, detail="密码长度至少4个字符")
    existing = db.query(User).filter(User.username == req.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="用户名已存在")
    user = User(
        username=req.username,
        password_hash=hash_password(req.password),
        balance=10000.0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id)})
    return {"token": token, "user": _user_dict(user)}


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    token = create_access_token({"sub": str(user.id)})
    return {"token": token, "user": _user_dict(user)}


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return _user_dict(current_user)


def _user_dict(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "balance": user.balance,
        "outstanding_loan": user.outstanding_loan,
        "loans_group_stage": user.loans_group_stage,
        "loans_knockout": user.loans_knockout,
    }
