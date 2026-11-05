from datetime import datetime
from sqlalchemy import Integer, String, Text, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class FavoriteItem(Base):
    """收藏清单条目（PRD §4.2 — MVP 每用户一个默认清单）"""
    __tablename__ = "favorite_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    tea_id: Mapped[int] = mapped_column(Integer, ForeignKey("teas.id", ondelete="CASCADE"), index=True)
    tasting_note: Mapped[str | None] = mapped_column(Text, nullable=True)  # 品鉴笔记
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "tea_id", name="uq_user_tea_favorite"),
        Index("ix_favorite_user_created", "user_id", "created_at"),
    )


class ShareToken(Base):
    """分享链接（PRD FR-5.4 — 生成唯一 URL）"""
    __tablename__ = "share_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token: Mapped[str] = mapped_column(String(32), unique=True, index=True)  # 短码（如 k7X9m2）
    title: Mapped[str] = mapped_column(String(200), default="我的品茶清单")
    is_active: Mapped[bool] = mapped_column(default=True)  # 撤销后 False
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
