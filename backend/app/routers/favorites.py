from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.response import ok

router = APIRouter()


# TODO: 实现收藏相关接口
# POST / 收藏
# DELETE / 取消收藏
# GET / 某茶品的收藏数
@router.post("/{tea_id}")
def add_favorite(tea_id: int, db: Session = Depends(get_db)):
    return ok()


@router.delete("/{tea_id}")
def remove_favorite(tea_id: int, db: Session = Depends(get_db)):
    return ok()
