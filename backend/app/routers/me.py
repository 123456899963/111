"""我的模块路由（S15 / API_CONTRACT §4.7）"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth_deps import get_current_user
from app.core.database import get_db
from app.core.response import ok
from app.services import stats as stats_service

router = APIRouter()


@router.get("/stats")
def get_my_stats(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """当前用户统计与等级（§4.7.1）。需登录。"""
    data = stats_service.get_stats(db, current_user.id)
    return ok(data.model_dump())
