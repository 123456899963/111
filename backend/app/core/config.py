from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # === 基础 ===
    APP_NAME: str = "茶·图鉴 API"
    DEBUG: bool = True

    # === 数据库 ===
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = "root"
    MYSQL_DATABASE: str = "tea_guide"

    # === 会话 ===
    SECRET_KEY: str = "change-me-in-production-please-use-a-long-random-string"
    SESSION_EXPIRE_DAYS: int = 30  # PRD FR-4.3：30 天 Cookie 会话

    # === CORS ===
    # 开发期允许的前端源；生产经 Nginx 同域反代后可改为 ["http://localhost"]
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # === 文件 ===
    UPLOAD_DIR: Path = Path("uploads")
    MAX_UPLOAD_SIZE_MB: int = 5

    # === 管理员初始账号 ===
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "admin123"

    @property
    def DATABASE_URL(self) -> str:
        # charset=utf8mb4 支持完整中文 + emoji
        # 排序规则在建库时指定（utf8mb4_unicode_ci，兼容 MySQL 5.7 / 8.0），
        # 见 docs/architecture/TECH_STACK.md §6
        return (
            f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}"
            f"@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}"
            f"?charset=utf8mb4"
        )

    class Config:
        env_file = ".env"


settings = Settings()
