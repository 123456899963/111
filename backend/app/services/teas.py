from sqlalchemy import func, or_, text
from sqlalchemy.orm import Session

from app.core.response import TeaNotFound, TeaOffShelf
from app.models.tea import Tea


def list_teas(db: Session, params: dict) -> dict:
    """
    茶品列表 + 筛选 + 排序 + 分页（FR-1.1 ~ FR-1.6）

    筛选维度：茶类 / 产地 / 采摘季节（三个维度 AND，同维度多选 OR）
    排序：最新上架 / 收藏最多
    """
    query = db.query(Tea).filter(Tea.is_active == True)  # noqa: E712

    # —— 筛选 ——
    if params.get("category"):
        # 逗号分隔支持多选：?category=green,oolong
        cats = [c.strip() for c in params["category"].split(",") if c.strip()]
        query = query.filter(Tea.category.in_(cats))

    if params.get("origin"):
        origins = [o.strip() for o in params["origin"].split(",") if o.strip()]
        query = query.filter(Tea.origin.in_(origins))

    if params.get("season"):
        seasons = [s.strip() for s in params["season"].split(",") if s.strip()]
        query = query.filter(Tea.season.in_(seasons))

    # 关键词搜索（MVP：简单 name/ origin LIKE 匹配，X9 不做相关度）
    if params.get("keyword"):
        kw = f"%{params['keyword']}%"
        query = query.filter(or_(Tea.name.like(kw), Tea.origin.like(kw)))

    # —— 排序 ——
    sort = params.get("sort", "newest")
    if sort == "favorite":
        query = query.order_by(Tea.favorite_count.desc(), Tea.created_at.desc())
    else:
        query = query.order_by(Tea.created_at.desc())

    # —— 分页 ——
    total = query.count()
    page = max(1, params.get("page", 1))
    page_size = max(1, min(50, params.get("page_size", 12)))
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def hot_teas(db: Session, limit: int = 8) -> list[Tea]:
    """热门推荐：全部已上架茶品按收藏数降序取前 N（FR-2.2，MVP 总量排序）"""
    return (
        db.query(Tea)
        .filter(Tea.is_active == True)  # noqa: E712
        .order_by(Tea.favorite_count.desc(), Tea.created_at.desc())
        .limit(limit)
        .all()
    )


def random_tea(db: Session, exclude_id: int | None = None) -> Tea | None:
    """
    随机发现（FR-2.3）。
    MVP 数据量 < 1000 行，ORDER BY RAND() 性能可接受。
    """
    query = db.query(Tea).filter(Tea.is_active == True)  # noqa: E712
    if exclude_id is not None:
        query = query.filter(Tea.id != exclude_id)
    return query.order_by(text("RAND()")).first()


def categories(db: Session) -> list[dict]:
    """六大茶类 + 各分类已收录数量（FR-2.1）"""
    result = (
        db.query(Tea.category, func.count(Tea.id))
        .filter(Tea.is_active == True)  # noqa: E712
        .group_by(Tea.category)
        .all()
    )
    category_names = ["green", "white", "yellow", "red", "oolong", "dark"]
    count_map = dict(result)
    return [{"category": cat, "count": count_map.get(cat, 0)} for cat in category_names]


def origins(db: Session) -> list[dict]:
    """产地列表（省级 + 已收录数量）"""
    result = (
        db.query(Tea.origin, func.count(Tea.id))
        .filter(Tea.is_active == True)  # noqa: E712
        .group_by(Tea.origin)
        .order_by(func.count(Tea.id).desc())
        .all()
    )
    return [{"origin": o, "count": c} for o, c in result]


def get_tea(db: Session, tea_id: int) -> Tea:
    """获取茶品详情；已下架则返回 TeaOffShelf 异常"""
    tea = db.query(Tea).filter(Tea.id == tea_id).first()
    if not tea:
        raise TeaNotFound
    if not tea.is_active:
        raise TeaOffShelf
    return tea
