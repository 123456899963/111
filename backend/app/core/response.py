"""统一响应体 & 业务异常"""

from typing import Any

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class TeaGuideError(Exception):
    """业务异常基类，携带 HTTP 状态码和业务消息"""

    def __init__(self, code: int, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


def ok(data: Any = None, message: str = "ok") -> dict:
    """统一成功响应体"""
    return {"code": 0, "message": message, "data": data}


def error(code: int, message: str) -> dict:
    """统一失败响应体"""
    return {"code": code, "message": message, "data": None}


# === 常用业务异常快捷构造 ===

TeaNotFound = TeaGuideError(40400, "茶品不存在")
TeaOffShelf = TeaGuideError(40401, "该茶品暂不可用")
UserUnauthorized = TeaGuideError(40100, "未登录或登录已过期")
UserForbidden = TeaGuideError(40300, "无权限执行此操作")
ShareNotFound = TeaGuideError(40410, "该分享已被撤销或不存在")
ShareAlreadyRevoked = TeaGuideError(40900, "该分享已被撤销")
FavoriteNotFound = TeaGuideError(40430, "该茶品不在当前用户收藏中")
UsernameExists = TeaGuideError(40910, "用户名已存在")
BadCredentials = TeaGuideError(40110, "用户名或密码错误")
ValidationError = TeaGuideError(40000, "参数校验失败")
FileTooLarge = TeaGuideError(41300, "文件超过 5 MB")
UnsupportedMedia = TeaGuideError(41500, "仅支持 JPEG/PNG/WebP 图片")
InternalError = TeaGuideError(50000, "服务器内部错误")


def register_exception_handlers(app):
    """注册全局异常处理器"""

    @app.exception_handler(TeaGuideError)
    async def handle_business_error(request: Request, exc: TeaGuideError):
        http_status = exc.code // 100  # 40400 → 404, 40100 → 401
        return JSONResponse(
            status_code=min(http_status, 599),
            content={"code": exc.code, "message": exc.message, "data": None},
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError):
        # FastAPI 422 统一重映射为 400/40000（API_CONTRACT §1.6）
        return JSONResponse(
            status_code=400,
            content={"code": 40000, "message": "参数校验失败", "data": None},
        )
