from sqlalchemy.orm import Session

from app.core.response import UsernameExists, BadCredentials
from app.core.security import hash_password, verify_password
from app.models.user import User


def register(db: Session, username: str, password: str) -> User:
    """注册新用户（用户名唯一性校验）"""
    existing = db.query(User).filter(User.username == username).first()
    if existing:
        raise UsernameExists

    user = User(username=username, password_hash=hash_password(password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login(db: Session, username: str, password: str) -> User:
    """校验用户名 + 密码"""
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.password_hash):
        raise BadCredentials
    return user


def get_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()
