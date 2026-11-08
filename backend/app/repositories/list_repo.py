"""清单仓储层：仅封装 SQLAlchemy 查询与写入（ARCHITECTURE §3）"""

from datetime import datetime

from sqlalchemy.orm import Session

from app.models.collection_list import CollectionList
from app.models.favorite import FavoriteItem
from app.models.tea import Tea


def get_by_user(db: Session, user_id: int) -> CollectionList | None:
    return db.query(CollectionList).filter(CollectionList.user_id == user_id).first()


def get_by_id(db: Session, list_id: int) -> CollectionList | None:
    return db.query(CollectionList).filter(CollectionList.id == list_id).first()


def get_by_user_for_update(db: Session, user_id: int) -> CollectionList | None:
    """行锁读取（并发生成分享令牌时串行化）。"""
    return (
        db.query(CollectionList).filter(CollectionList.user_id == user_id).with_for_update().first()
    )


def create(db: Session, user_id: int, title: str = "我的收藏") -> CollectionList:
    """创建默认清单并提交；唯一冲突由 Service 捕获 IntegrityError。"""
    item = CollectionList(user_id=user_id, title=title)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_title(db: Session, list_obj: CollectionList, title: str) -> CollectionList:
    list_obj.title = title
    list_obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(list_obj)
    return list_obj


def list_items(db: Session, user_id: int) -> list[tuple[FavoriteItem, Tea]]:
    """清单条目：按 favorited_at DESC, tea_id DESC（§4.4.1）。"""
    return (
        db.query(FavoriteItem, Tea)
        .join(Tea, Tea.id == FavoriteItem.tea_id)
        .filter(FavoriteItem.user_id == user_id)
        .order_by(FavoriteItem.created_at.desc(), FavoriteItem.tea_id.desc())
        .all()
    )


def get_favorite_item(db: Session, user_id: int, tea_id: int) -> FavoriteItem | None:
    return (
        db.query(FavoriteItem)
        .filter(FavoriteItem.user_id == user_id, FavoriteItem.tea_id == tea_id)
        .first()
    )


def update_note(db: Session, item: FavoriteItem, note: str | None) -> FavoriteItem:
    item.tasting_note = note
    db.commit()
    db.refresh(item)
    return item
