"""茶品路由（只读，游客可访问）

路由声明 / 参数接收 / Depends 注入；业务逻辑在 services，查询在 repositories。
注意：静态段 /categories /origins /hot /random 必须先于动态段 /{tea_id} 注册
（API_CONTRACT §1.1）。
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.response import ok
from app.services import teas as teas_service

router = APIRouter()


@router.get("")
def list_teas(
    category: str | None = Query(None, description="逗号分隔茶类枚举"),
    origin: str | None = Query(None, description="逗号分隔省级名称"),
    season: str | None = Query(None, description="逗号分隔采摘季节"),
    keyword: str | None = Query(None, description="关键词（name/origin 模糊匹配）"),
    sort: str = Query("newest", description="newest | favorite"),
    page: int = Query(1),
    page_size: int = Query(12),
    db: Session = Depends(get_db),
):
    """茶品列表（筛选 + 排序 + 分页，API_CONTRACT §4.2.1）"""
    data = teas_service.list_teas(
        db,
        category=category,
        origin=origin,
        season=season,
        keyword=keyword,
        sort=sort,
        page=page,
        page_size=page_size,
    )
    return ok(data)


@router.get("/categories")
def categories(db: Session = Depends(get_db)):
    """六大茶类计数（API_CONTRACT §4.2.2）"""
    return ok(teas_service.categories(db))


@router.get("/origins")
def origins(db: Session = Depends(get_db)):
    """产地选项（省级 + 计数，API_CONTRACT §4.2.3）"""
    return ok(teas_service.origins(db))


@router.get("/hot")
def hot_teas(limit: int = Query(8), db: Session = Depends(get_db)):
    """热门推荐（API_CONTRACT §4.2.4）"""
    return ok(teas_service.hot_teas(db, limit=limit))


@router.get("/random")
def random_tea(exclude_id: int | None = Query(None), db: Session = Depends(get_db)):
    """随机发现（API_CONTRACT §4.2.5）"""
    return ok(teas_service.random_tea(db, exclude_id=exclude_id))


@router.get("/{tea_id}")
def get_tea(tea_id: int, db: Session = Depends(get_db)):
    """茶品详情（API_CONTRACT §4.2.6）"""
    return ok(teas_service.get_tea(db, tea_id))
