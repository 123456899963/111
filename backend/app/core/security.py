"""安全工具：密码哈希、会话签名、管理员权限校验"""
import bcrypt
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from app.core.config import settings


# --- 密码哈希 ---

def hash_password(password: str) -> str:
    """明文密码 → bcrypt 哈希（PRD 4.3 指定 bcrypt）"""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """校验明文密码与 bcrypt 哈希是否匹配"""
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


# --- 会话签名 ---

_serializer = URLSafeTimedSerializer(settings.SECRET_KEY)


def create_session_token(user_id: int) -> str:
    """把 user_id 签名为 Cookie 令牌（itsdangerous 签名 Cookie，无状态）"""
    return _serializer.dumps({"uid": user_id})


def verify_session_token(token: str, max_age_days: int | None = None) -> int | None:
    """解析 Cookie 令牌，返回 user_id；过期或无效返回 None"""
    try:
        max_age = (max_age_days or settings.SESSION_EXPIRE_DAYS) * 86400
        data = _serializer.loads(token, max_age=max_age)
        return data.get("uid")
    except (BadSignature, SignatureExpired):
        return None
