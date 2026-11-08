"""茶品仓储层：仅封装 SQLAlchemy 查询，不做业务判断（ARCHITECTURE §3 红线）

参数解析、枚举校验、分页夹取均在 Service 层完成；
本层只接收已解析好的结构化条件。
"""

from sqlalchemy import func, or_, text
from sqlalchemy.orm import Session, joinedload

from app.models.tea import Tea


def list_teas(
    db: Session,
    *,
    categories: list[str] | None = None,
    provinces: list[str] | None = None,
    seasons: list[str] | None = None,
    keyword: str | None = None,
    sort: str = "newest",
    offset: int = 0,
    limit: int = 12,
) -> tuple[list[Tea], int]:
    """公开列表查询：仅 is_active=1；返回 (当前页数据, 过滤后总数)。"""
    query = db.query(Tea).filter(Tea.is_active.is_(True))

    if categories:
        query = query.filter(Tea.category.in_(categories))
    if provinces:
        # 省级前缀匹配（API_CONTRACT §4.2.1：如 "浙江%"）
        query = query.filter(or_(*[Tea.origin.like(f"{p}%") for p in provinces]))
    if seasons:
        query = query.filter(Tea.season.in_(seasons))
    if keyword:
        kw = f"%{keyword}%"
        query = query.filter(or_(Tea.name.like(kw), Tea.origin.like(kw)))

    # 排序必须带稳定次级键 id DESC（API_CONTRACT §1.6）
    if sort == "favorite":
        query = query.order_by(Tea.favorite_count.desc(), Tea.created_at.desc(), Tea.id.desc())
    else:
        query = query.order_by(Tea.created_at.desc(), Tea.id.desc())

    total = query.count()
    items = query.offset(offset).limit(limit).all()
    return items, total


def list_hot(db: Session, limit: int) -> list[Tea]:
    """热门推荐：favorite_count DESC, created_at DESC, id DESC（API_CONTRACT §4.2.4）。"""
    return (
        db.query(Tea)
        .filter(Tea.is_active.is_(True))
        .order_by(Tea.favorite_count.desc(), Tea.created_at.desc(), Tea.id.desc())
        .limit(limit)
        .all()
    )


def get_random(db: Session, exclude_id: int | None = None) -> Tea | None:
    """随机发现：仅 is_active=1 中取 1 条（FR-2.3 完全随机）。"""
    query = db.query(Tea).filter(Tea.is_active.is_(True))
    if exclude_id is not None:
        query = query.filter(Tea.id != exclude_id)
    # 数据量 < 1000 行，ORDER BY RAND() 成本可接受
    return query.options(joinedload(Tea.tips)).order_by(text("RAND()")).limit(1).first()


def count_by_category(db: Session) -> dict[str, int]:
    """各茶类已上架数量（仅 is_active=1）。"""
    rows = (
        db.query(Tea.category, func.count(Tea.id))
        .filter(Tea.is_active.is_(True))
        .group_by(Tea.category)
        .all()
    )
    return dict(rows)


def count_by_province(db: Session) -> list[tuple[str, int]]:
    """各省份已上架数量：省级名由 origin 第一个空格前片段派生（API_CONTRACT §4.2.3）。

    返回按 count DESC, origin ASC 排序的 (province, count) 列表。
    """
    province_col = func.substring_index(Tea.origin, " ", 1)
    rows = (
        db.query(province_col.label("province"), func.count(Tea.id).label("cnt"))
        .filter(Tea.is_active.is_(True))
        .group_by("province")
        .order_by(text("cnt DESC"), text("province ASC"))
        .all()
    )
    return [(row.province, row.cnt) for row in rows]


def get_by_id(db: Session, tea_id: int) -> Tea | None:
    """按主键查询（含小贴士，用于详情扁平化）。"""
    return db.query(Tea).options(joinedload(Tea.tips)).filter(Tea.id == tea_id).first()


def get_by_id_for_update(db: Session, tea_id: int) -> Tea | None:
    """按主键加排他锁（收藏/取消时串行化计数，避免 FK 共享锁死锁）。"""
    return db.query(Tea).filter(Tea.id == tea_id).with_for_update().first()


def lock_by_ids(db: Session, tea_ids: list[int]) -> None:
    """按 id 升序批量加锁，统一加锁顺序避免多茶品并发 copy 死锁。"""
    if not tea_ids:
        return
    db.query(Tea.id).filter(Tea.id.in_(sorted(tea_ids))).order_by(
        Tea.id.asc()
    ).with_for_update().all()
