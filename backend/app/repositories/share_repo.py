"""分享令牌仓储层：仅封装查询与写入（ARCHITECTURE §3）"""

from datetime import datetime

from sqlalchemy.orm import Session

from app.models.favorite import ShareToken


def get_active_by_list(db: Session, list_id: int, *, for_update: bool = False) -> ShareToken | None:
    """清单当前生效令牌（无则为 None）。

    for_update=True 使用当前读，避免 REPEATABLE READ 旧快照导致并发重复生成。
    """
    query = db.query(ShareToken).filter(
        ShareToken.list_id == list_id, ShareToken.is_active.is_(True)
    )
    if for_update:
        query = query.with_for_update()
    return query.order_by(ShareToken.id.desc()).first()


def get_by_token(db: Session, token: str) -> ShareToken | None:
    """按 token 精确查询（列 collation 为 utf8mb4_bin，大小写敏感）。"""
    return db.query(ShareToken).filter(ShareToken.token == token).first()


def create(db: Session, list_id: int, token: str) -> ShareToken:
    item = ShareToken(list_id=list_id, token=token, is_active=True)
    db.add(item)
    db.flush()
    return item


def revoke(db: Session, item: ShareToken) -> ShareToken:
    item.is_active = False
    item.revoked_at = datetime.utcnow()
    db.commit()
    db.refresh(item)
    return item
