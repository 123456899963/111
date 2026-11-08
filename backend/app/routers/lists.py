"""清单与品鉴笔记路由（API_CONTRACT §4.4）"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth_deps import get_current_user
from app.core.database import get_db
from app.core.response import ok
from app.schemas.list import NoteUpdateRequest, TitleUpdateRequest
from app.services import lists as lists_service

router = APIRouter()


@router.get("")
def get_my_list(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取我的默认清单（§4.4.1）"""
    data = lists_service.get_my_list(db, current_user.id)
    return ok(data.model_dump())


@router.put("/title")
def update_title(
    payload: TitleUpdateRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """更新清单标题（§4.4.2）"""
    data = lists_service.update_title(db, current_user.id, payload.title)
    return ok(data.model_dump())


@router.put("/notes/{tea_id}")
def save_note(
    tea_id: int,
    payload: NoteUpdateRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """保存/清空品鉴笔记（§4.4.3）"""
    data = lists_service.save_note(
        db, user_id=current_user.id, tea_id=tea_id, content=payload.content
    )
    return ok(data.model_dump())
