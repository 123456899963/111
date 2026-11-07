from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import Base, engine  # noqa: F401 —— 开发期建表开关使用
from app.core.response import ok, register_exception_handlers
from app.routers import admin, auth, favorites, lists, shares, teas

# 初始化数据库表（开发期用，生产环境走 Alembic 迁移）
# Base.metadata.create_all(bind=engine)


def create_app() -> FastAPI:
    app = FastAPI(
        title="茶·图鉴 API",
        description="六大茶类结构化知识库平台 — MVP 后端",
        version="0.1.0",
    )

    # CORS 配置（开发期兜底；生产经 Nginx 同域反代后跨域消失）
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 注册全局异常处理器（业务异常 → 统一响应体，HTTP status = code // 100）
    register_exception_handlers(app)

    # 注册路由
    app.include_router(auth.router, prefix="/api/v1/auth", tags=["认证"])
    app.include_router(teas.router, prefix="/api/v1/teas", tags=["茶品"])
    app.include_router(favorites.router, prefix="/api/v1/favorites", tags=["收藏"])
    app.include_router(lists.router, prefix="/api/v1/lists", tags=["清单"])
    app.include_router(shares.router, prefix="/api/v1/shares", tags=["分享"])
    app.include_router(admin.router, prefix="/api/v1/admin", tags=["管理员"])

    # 静态挂载 uploads 目录（图片存储）
    uploads_dir = Path("uploads")
    uploads_dir.mkdir(exist_ok=True)
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

    @app.get("/api/v1/health")
    def health():
        return ok({"status": "ok"})

    return app


app = create_app()
