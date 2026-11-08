"""茶品业务层：参数解析/校验、分页夹取、DTO 组装（不拼 SQL，不返回 ORM）

对齐 API_CONTRACT §4.2：
- 同维度多选 OR、跨维度 AND（PRD FR-1.2）
- 枚举非法、keyword 超 50 字符 → 40000
- page/page_size/limit 越界夹取（§1.6 / §4.2.4）
- 下架茶品：列表/计数/产地/热门/随机全部隐藏；详情 40401
"""

from sqlalchemy.orm import Session

from app.core.response import TeaGuideError, TeaNotFound, TeaOffShelf
from app.repositories import tea_repo
from app.schemas.tea import (
    CATEGORY_VALUES,
    SEASON_VALUES,
    SORT_VALUES,
    CategoryCount,
    OriginCount,
    TeaDetail,
    TeaListItem,
    TeaListResponse,
)

MAX_KEYWORD_LEN = 50
DEFAULT_PAGE_SIZE = 12
MAX_PAGE_SIZE = 50
MAX_HOT_LIMIT = 20


def _split_csv(raw: str | None) -> list[str]:
    """逗号分隔多值解析，去空白与空项。"""
    if not raw:
        return []
    return [part.strip() for part in raw.split(",") if part.strip()]


def _validate_enum(values: list[str], allowed: tuple[str, ...], field: str) -> None:
    invalid = [v for v in values if v not in allowed]
    if invalid:
        raise TeaGuideError(40000, f"{field} 取值非法")


def list_teas(
    db: Session,
    *,
    category: str | None,
    origin: str | None,
    season: str | None,
    keyword: str | None,
    sort: str,
    page: int,
    page_size: int,
) -> TeaListResponse:
    """茶品列表 + 筛选 + 排序 + 分页（FR-1.1 ~ FR-1.6）"""
    categories = _split_csv(category)
    _validate_enum(categories, CATEGORY_VALUES, "category")

    provinces = _split_csv(origin)

    seasons = _split_csv(season)
    _validate_enum(seasons, SEASON_VALUES, "season")

    if sort not in SORT_VALUES:
        raise TeaGuideError(40000, "sort 取值非法")

    kw = (keyword or "").strip() or None
    if kw and len(kw) > MAX_KEYWORD_LEN:
        raise TeaGuideError(40000, "keyword 长度不能超过 50 字符")

    # 越界夹取，返回实际生效值（API_CONTRACT §1.6）
    page = max(1, page)
    page_size = min(max(1, page_size), MAX_PAGE_SIZE)

    items, total = tea_repo.list_teas(
        db,
        categories=categories or None,
        provinces=provinces or None,
        seasons=seasons or None,
        keyword=kw,
        sort=sort,
        offset=(page - 1) * page_size,
        limit=page_size,
    )
    return TeaListResponse(
        items=[TeaListItem.model_validate(t) for t in items],
        total=total,
        page=page,
        page_size=page_size,
    )


def hot_teas(db: Session, *, limit: int) -> list[TeaListItem]:
    """热门推荐（FR-2.2）：limit 夹取 1-20，默认 8"""
    limit = min(max(1, limit), MAX_HOT_LIMIT)
    items = tea_repo.list_hot(db, limit)
    return [TeaListItem.model_validate(t) for t in items]


def random_tea(db: Session, *, exclude_id: int | None) -> TeaDetail | None:
    """随机发现（FR-2.3）：无可选茶品时返回 None"""
    tea = tea_repo.get_random(db, exclude_id=exclude_id)
    return TeaDetail.model_validate(tea) if tea else None


def categories(db: Session) -> list[CategoryCount]:
    """六大茶类计数（FR-2.1）：固定六项、固定顺序、无收录返回 0"""
    count_map = tea_repo.count_by_category(db)
    return [CategoryCount(category=cat, count=count_map.get(cat, 0)) for cat in CATEGORY_VALUES]


def origins(db: Session) -> list[OriginCount]:
    """产地选项（省级 + 计数，count DESC, origin ASC）"""
    return [
        OriginCount(origin=province, count=cnt) for province, cnt in tea_repo.count_by_province(db)
    ]


def get_tea(db: Session, tea_id: int) -> TeaDetail:
    """茶品详情（FR-3.1）：不存在 40400，已下架 40401"""
    tea = tea_repo.get_by_id(db, tea_id)
    if not tea:
        raise TeaNotFound
    if not tea.is_active:
        raise TeaOffShelf
    return TeaDetail.model_validate(tea)
