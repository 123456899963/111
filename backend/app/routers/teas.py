from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.response import ok
from app.services import teas as teas_service

router = APIRouter()


@router.get("")
def list_teas(
    category: str | None = None,
    origin: str | None = None,
    season: str | None = None,
    sort: str = "newest",  # newest | favorite
    keyword: str | None = None,
    page: int = 1,
    page_size: int = 12,
    db: Session = Depends(get_db),
):
    """茶品列表 + 筛选（PRD FR-1.1 ~ FR-1.6）"""
    return ok(teas_service.list_teas(db, locals()))


@router.get("/hot")
def hot_teas(db: Session = Depends(get_db)):
    """热门推荐（收藏数降序取前 8，FR-2.2）"""
    return ok(teas_service.hot_teas(db, limit=8))


@router.get("/random")
def random_tea(exclude_id: int | None = None, db: Session = Depends(get_db)):
    """随机发现（FR-2.3，完全随机）"""
    return ok(teas_service.random_tea(db, exclude_id=exclude_id))


@router.get("/categories")
def categories(db: Session = Depends(get_db)):
    """六大茶类 + 各分类已收录数量（FR-2.1）"""
    return ok(teas_service.categories(db))


@router.get("/origins")
def origins(db: Session = Depends(get_db)):
    """产地列表（省级 + 已收录数量）"""
    return ok(teas_service.origins(db))


@router.get("/{tea_id}")
def get_tea(tea_id: int, db: Session = Depends(get_db)):
    """茶品详情（FR-3.1）"""
    return ok(teas_service.get_tea(db, tea_id))
