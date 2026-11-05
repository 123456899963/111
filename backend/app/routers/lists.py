from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.response import ok

router = APIRouter()


# TODO: 实现清单 + 品鉴笔记相关接口
# PRD FR-5.1 ~ FR-5.3
@router.get("")
def get_my_list(db: Session = Depends(get_db)):
    return ok()


@router.put("/title")
def update_title(title: str, db: Session = Depends(get_db)):
    return ok()


@router.post("/notes")
def save_note(tea_id: int, content: str, db: Session = Depends(get_db)):
    return ok()
