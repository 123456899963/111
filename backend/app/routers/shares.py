from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.response import ok

router = APIRouter()


# TODO: 实现分享链接相关接口
# POST /generate — 生成分享链接（FR-5.4）
# POST /revoke — 撤销分享（FR-5.5）
# GET /{share_id} — 公开查看分享清单（无需登录）
# POST /{share_id}/copy — 一键收藏全部（FR-5.6）
@router.post("/generate")
def generate(db: Session = Depends(get_db)):
    return ok()


@router.post("/revoke")
def revoke(db: Session = Depends(get_db)):
    return ok()


@router.get("/{share_id}")
def view(share_id: str, db: Session = Depends(get_db)):
    return ok()


@router.post("/{share_id}/copy")
def copy_all(share_id: str, db: Session = Depends(get_db)):
    return ok()
