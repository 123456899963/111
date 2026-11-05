from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.response import ok
from app.core.security import create_session_token, verify_password, hash_password
from app.schemas.auth import RegisterRequest, LoginRequest
from app.services import auth as auth_service

router = APIRouter()


@router.post("/register")
def register(req: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    """用户注册 → 自动登录 → 设置 Cookie 会话"""
    user = auth_service.register(db, req.username, req.password)
    token = create_session_token(user.id)
    response.set_cookie(
        key="tea_session",
        value=token,
        max_age=30 * 86400,
        httponly=True,
        samesite="lax",
    )
    return ok({"user_id": user.id, "username": user.username})


@router.post("/login")
def login(req: LoginRequest, response: Response, db: Session = Depends(get_db)):
    """用户登录 → 设置 Cookie 会话"""
    user = auth_service.login(db, req.username, req.password)
    token = create_session_token(user.id)
    response.set_cookie(
        key="tea_session",
        value=token,
        max_age=30 * 86400,
        httponly=True,
        samesite="lax",
    )
    return ok({"user_id": user.id, "username": user.username})


@router.post("/logout")
def logout(response: Response):
    """退出登录 → 清除 Cookie"""
    response.delete_cookie(key="tea_session")
    return ok()


@router.get("/me")
def me(user_id: int | None = None):
    """获取当前登录用户信息（由依赖注入提供 user_id）"""
    # TODO: 通过 FastAPI Depends 注入当前用户
    return ok({"user_id": user_id})
