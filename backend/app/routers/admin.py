"""管理员后台路由（API_CONTRACT §4.6）

红线：
- 所有端点先鉴权后校验参数：router 级 Depends(get_admin_user) 在最前执行
- 前端路由守卫仅是体验层，不构成安全边界（SECURITY S-11）
- 不提供用户管理/日志查询/审核队列/批量导入/物理删除
"""

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.orm import Session

from app.core.auth_deps import get_admin_user
from app.core.database import get_db
from app.core.response import ok
from app.schemas.admin import TipsUpdateRequest
from app.schemas.tea import TeaCreateRequest, TeaUpdateRequest
from app.services import admin as admin_service

router = APIRouter(dependencies=[Depends(get_admin_user)])


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    """A2 仪表盘统计（API_CONTRACT §4.6.8）。"""
    return ok(admin_service.stats(db).model_dump(mode="json"))


@router.get("/teas")
def list_teas(
    category: str | None = Query(None),
    keyword: str | None = Query(None),
    is_active: bool | None = Query(None),
    sort: str = Query("newest"),
    page: int = Query(1),
    page_size: int = Query(12),
    db: Session = Depends(get_db),
):
    """A3 后台茶品列表（API_CONTRACT §4.6.1）：包含下架茶品。"""
    data = admin_service.list_teas(
        db,
        category=category,
        keyword=keyword,
        is_active=is_active,
        sort=sort,
        page=page,
        page_size=page_size,
    )
    return ok(data.model_dump(mode="json"))


@router.get("/teas/{tea_id}")
def get_tea(tea_id: int, db: Session = Depends(get_db)):
    """A5 后台茶品详情（API_CONTRACT §4.6.2）。"""
    return ok(admin_service.get_tea(db, tea_id).model_dump(mode="json"))


@router.post("/teas")
def create_tea(
    payload: TeaCreateRequest,
    admin=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """A4 新增茶品（API_CONTRACT §4.6.3）。"""
    data = admin_service.create_tea(db, admin_id=admin.id, req=payload)
    return ok(data.model_dump(mode="json"))


@router.put("/teas/{tea_id}")
def update_tea(
    tea_id: int,
    payload: TeaUpdateRequest,
    admin=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """A5 全量编辑茶品（API_CONTRACT §4.6.4），不接受 tips_* 与 is_active。"""
    data = admin_service.update_tea(db, admin_id=admin.id, tea_id=tea_id, req=payload)
    return ok(data.model_dump(mode="json"))


@router.patch("/teas/{tea_id}/toggle")
def toggle_tea(
    tea_id: int,
    admin=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """A3/A5 上下架（API_CONTRACT §4.6.5）：不物理删除。"""
    data = admin_service.toggle_tea(db, admin_id=admin.id, tea_id=tea_id)
    return ok(data.model_dump(mode="json"))


@router.put("/teas/{tea_id}/tips")
def update_tips(
    tea_id: int,
    payload: TipsUpdateRequest,
    admin=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """A5 官方小贴士编辑（API_CONTRACT §4.6.6）。"""
    data = admin_service.update_tips(db, admin_id=admin.id, tea_id=tea_id, req=payload)
    return ok(data.model_dump(mode="json"))


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    admin=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """A4/A5 图片上传（API_CONTRACT §4.6.7）：JPEG/PNG/WebP ≤ 5 MB。"""
    data = await admin_service.upload_image(db, admin_id=admin.id, file=file)
    return ok(data.model_dump(mode="json"))
