"""收藏业务层（PRD FR-5.1 / API_CONTRACT §4.3）

- 收藏与取消幂等
- 收藏行与 teas.favorite_count 同事务维护
- 下架茶不可新增收藏，但允许取消/状态查询
- 并发依赖 UNIQUE(user_id, tea_id) 兜底，撞唯一冲突按“已收藏”处理
"""

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.response import TeaNotFound, TeaOffShelf
from app.models.tea import Tea
from app.repositories import favorite_repo, tea_repo
from app.schemas.favorite import FavoriteState


def _state(tea: Tea, is_favorited: bool) -> FavoriteState:
    return FavoriteState(
        tea_id=tea.id,
        is_favorited=is_favorited,
        favorite_count=int(tea.favorite_count or 0),
    )


def _get_tea_or_404(db: Session, tea_id: int) -> Tea:
    tea = tea_repo.get_by_id(db, tea_id)
    if not tea:
        raise TeaNotFound
    return tea


def _lock_tea_or_404(db: Session, tea_id: int) -> Tea:
    tea = tea_repo.get_by_id_for_update(db, tea_id)
    if not tea:
        raise TeaNotFound
    return tea


def add_favorite(db: Session, *, user_id: int, tea_id: int) -> FavoriteState:
    """收藏茶品（幂等）。下架茶返回 40401。"""
    # 先锁父行：收藏行 FK 会取共享锁，若再升级为更新会与并发请求互相死锁
    tea = _lock_tea_or_404(db, tea_id)
    if not tea.is_active:
        raise TeaOffShelf

    if favorite_repo.get_favorite(db, user_id, tea_id):
        db.commit()  # 释放行锁
        return _state(tea, True)

    try:
        favorite_repo.create_favorite(db, user_id, tea_id)
        favorite_repo.increment_favorite_count(db, tea_id)
        db.commit()
    except IntegrityError:
        # 并发下另一请求已插入同一 (user_id, tea_id)：按已收藏幂等处理
        db.rollback()
        tea = _get_tea_or_404(db, tea_id)
        return _state(tea, True)

    db.refresh(tea)
    return _state(tea, True)


def remove_favorite(db: Session, *, user_id: int, tea_id: int) -> FavoriteState:
    """取消收藏（幂等）。不校验 is_active，允许清理已下架条目。"""
    tea = _lock_tea_or_404(db, tea_id)

    removed = favorite_repo.delete_favorite(db, user_id, tea_id)
    if removed:
        favorite_repo.decrement_favorite_count(db, tea_id)
    db.commit()

    tea = _get_tea_or_404(db, tea_id)
    return _state(tea, False)


def get_status(db: Session, *, user_id: int, tea_id: int) -> FavoriteState:
    """查询收藏状态；允许已下架茶（清单占位场景）。"""
    tea = _get_tea_or_404(db, tea_id)
    is_favorited = favorite_repo.get_favorite(db, user_id, tea_id) is not None
    return _state(tea, is_favorited)
