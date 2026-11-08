"""清单与品鉴笔记业务层（PRD FR-5.1 ~ FR-5.3 / API_CONTRACT §4.4）

- 默认清单惰性创建，UNIQUE(user_id) 并发冲突按已存在处理
- 标题 trim 后 2–20 字
- 笔记 ≤20,000 字符；纯空白归一化为 NULL；清空不删除收藏条目
"""

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.response import FavoriteNotFound, TeaGuideError
from app.models.collection_list import CollectionList
from app.repositories import list_repo, share_repo
from app.schemas.list import (
    ListData,
    ListItem,
    NoteUpdateData,
    ShareBrief,
    TitleUpdateData,
)

TITLE_MIN_LEN = 2
TITLE_MAX_LEN = 20
NOTE_MAX_LEN = 20000
DEFAULT_TITLE = "我的收藏"


def get_or_create_default_list(db: Session, user_id: int) -> CollectionList:
    """取用户默认清单，不存在则创建；并发唯一冲突转为已存在。"""
    list_obj = list_repo.get_by_user(db, user_id)
    if list_obj:
        return list_obj
    try:
        return list_repo.create(db, user_id, DEFAULT_TITLE)
    except IntegrityError:
        db.rollback()
        list_obj = list_repo.get_by_user(db, user_id)
        if list_obj is None:
            raise
        return list_obj


def get_my_list(db: Session, user_id: int) -> ListData:
    list_obj = get_or_create_default_list(db, user_id)
    rows = list_repo.list_items(db, user_id)

    items = [
        ListItem(
            tea_id=tea.id,
            name=tea.name,
            category=tea.category,
            origin=tea.origin,
            season=tea.season,
            main_image_url=tea.main_image_url,
            favorite_count=int(tea.favorite_count or 0),
            is_available=bool(tea.is_active),
            tasting_note=fav.tasting_note,
            favorited_at=fav.created_at,
        )
        for fav, tea in rows
    ]

    active_share = share_repo.get_active_by_list(db, list_obj.id)
    share = (
        ShareBrief(
            token=active_share.token,
            url=f"/c/{active_share.token}",
            created_at=active_share.created_at,
        )
        if active_share
        else None
    )

    return ListData(
        id=list_obj.id,
        title=list_obj.title,
        tea_count=len(items),
        created_at=list_obj.created_at,
        updated_at=list_obj.updated_at,
        share=share,
        items=items,
    )


def update_title(db: Session, user_id: int, title: str) -> TitleUpdateData:
    normalized = (title or "").strip()
    if not (TITLE_MIN_LEN <= len(normalized) <= TITLE_MAX_LEN):
        raise TeaGuideError(40000, "清单标题需为 2–20 个字符")

    list_obj = get_or_create_default_list(db, user_id)
    list_obj = list_repo.update_title(db, list_obj, normalized)
    return TitleUpdateData(id=list_obj.id, title=list_obj.title, updated_at=list_obj.updated_at)


def save_note(db: Session, *, user_id: int, tea_id: int, content: str | None) -> NoteUpdateData:
    note = (content or "").strip() or None
    if note is not None and len(note) > NOTE_MAX_LEN:
        raise TeaGuideError(40000, "笔记过长")

    item = list_repo.get_favorite_item(db, user_id, tea_id)
    if item is None:
        raise FavoriteNotFound

    item = list_repo.update_note(db, item, note)
    return NoteUpdateData(tea_id=tea_id, tasting_note=item.tasting_note)
