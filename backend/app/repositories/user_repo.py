"""用户仓储层：仅封装 SQLAlchemy 查询，不做业务判断（ARCHITECTURE §3 红线）"""

from sqlalchemy.orm import Session

from app.models.user import User


def get_by_username(db: Session, username: str) -> User | None:
    """按用户名查询（登录、注册查重、可用性校验共用）。"""
    return db.query(User).filter(User.username == username).first()


def get_by_id(db: Session, user_id: int) -> User | None:
    """按主键查询（会话鉴权后取用户实体）。"""
    return db.query(User).filter(User.id == user_id).first()


def create_user(db: Session, username: str, password_hash: str) -> User:
    """创建新用户。调用方负责唯一性判断；唯一冲突由 IntegrityError 上抛给 Service 处理。"""
    user = User(username=username, password_hash=password_hash)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
