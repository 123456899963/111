"""统一响应体 & 业务异常"""

from typing import Any

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
UsernameExists = TeaGuideError(40910, "用户名已存在")
BadCredentials = TeaGuideError(40110, "用户名或密码错误")
ValidationError = TeaGuideError(40000, "参数校验失败")


def register_exception_handlers(app):
    """注册全局异常处理器"""

    @app.exception_handler(TeaGuideError)
    async def handle_business_error(request, exc: TeaGuideError):
        http_status = exc.code // 100  # 40400 → 404, 40100 → 401
        return JSONResponse(
            status_code=min(http_status, 599),
            content={"code": exc.code, "message": exc.message, "data": None},
        )
