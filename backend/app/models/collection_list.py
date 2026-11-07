from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, text
from sqlalchemy.dialects.mysql import INTEGER as MySQLInteger
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CollectionList(Base):
    """用户默认收藏清单（PRD §4.2 / FR-5.1 / FR-5.2）

    MVP 一人一清单：UNIQUE(user_id) 固化；
    可见性不落列，由 share_tokens.is_active 派生。
    """

    __tablename__ = "collection_lists"

    id: Mapped[int] = mapped_column(
        MySQLInteger(unsigned=True), primary_key=True, autoincrement=True
    )
    user_id: Mapped[int] = mapped_column(
        MySQLInteger(unsigned=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(50), nullable=False, default="我的收藏")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, server_default=text("CURRENT_TIMESTAMP")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    __table_args__ = (UniqueConstraint("user_id", name="uk_list_user"),)
