from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.response import ok

router = APIRouter()


# TODO: 实现管理员后台接口（需要管理员权限校验）
# —— 茶品 CRUD + 上下架
# POST /teas 新增
# PUT /teas/{id} 编辑
# PATCH /teas/{id}/toggle 上下架
# DELETE /teas/{id} 软删除
# —— 小贴士编辑
# PUT /teas/{id}/tips 编辑四个小贴士区块
# —— 仪表盘
# GET /stats 茶品总数/上架数/下架数/六大茶类分布
# —— 文件上传
# POST /upload 图片上传（返回 URL）
@router.post("/teas")
def create_tea(db: Session = Depends(get_db)):
    return ok()


@router.put("/teas/{tea_id}")
def update_tea(tea_id: int, db: Session = Depends(get_db)):
    return ok()


@router.patch("/teas/{tea_id}/toggle")
def toggle_shelf(tea_id: int, db: Session = Depends(get_db)):
    return ok()


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    return ok()


@router.post("/upload")
async def upload(file: UploadFile = File(...), db: Session = Depends(get_db)):
    return ok()
