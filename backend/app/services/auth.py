"""认证业务层：注册、登录、用户查询

安全控制落点（SECURITY）：
- S-01：密码 bcrypt 哈希（在 core/security.py）
- S-04：登录失败统一 40110，对不存在用户执行哑哈希比对（等时）
- S-05：用户名唯一性，并发注册以唯一索引兜底（IntegrityError → 40910）
- S-20：不整包映射 ORM，字段显式构造
"""

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.response import BadCredentials, UsernameExists
from app.core.security import DUMMY_HASH, hash_password, verify_password
from app.models.user import User
from app.repositories import user_repo


def register(db: Session, username: str, password: str) -> User:
    """注册新用户。

    先查重给出友好提示；并发注册撞唯一索引时捕获 IntegrityError 转 40910，
    不得返回 500（SECURITY S-05 / S-26）。
    """
    if user_repo.get_by_username(db, username):
        raise UsernameExists

    try:
        return user_repo.create_user(db, username, hash_password(password))
    except IntegrityError:
        # 并发场景：查重与创建之间另一个请求抢先插入
        db.rollback()
        raise UsernameExists


def login(db: Session, username: str, password: str) -> User:
    """校验用户名 + 密码。

    用户名不存在与密码错误统一返回 40110（不区分）；对不存在的用户也执行一次
    bcrypt 哑哈希比对，避免响应时间差暴露账号是否存在（SECURITY S-04）。
    """
    user = user_repo.get_by_username(db, username)
    if not user:
        # 等时比对：对哑哈希做一次校验，消耗与正常登录相近的时间
        verify_password(password, DUMMY_HASH)
        raise BadCredentials

    if not verify_password(password, user.password_hash):
        raise BadCredentials
    return user


def get_by_id(db: Session, user_id: int) -> User | None:
    return user_repo.get_by_id(db, user_id)
