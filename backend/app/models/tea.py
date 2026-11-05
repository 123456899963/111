from datetime import datetime
from sqlalchemy import Integer, String, Text, Float, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Tea(Base):
    """茶品图鉴卡片（PRD §4.1）"""
    __tablename__ = "teas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    category: Mapped[str] = mapped_column(
        Enum("green", "white", "yellow", "red", "oolong", "dark", name="tea_category"),
        nullable=False,
        index=True,
    )
    origin: Mapped[str] = mapped_column(String(200), nullable=False)
    season: Mapped[str | None] = mapped_column(String(32), nullable=True)
    fermentation: Mapped[str | None] = mapped_column(String(32), nullable=True)
    price_range: Mapped[str | None] = mapped_column(String(32), nullable=True)
    representative_variety: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # 四大感官
    shape_desc: Mapped[str] = mapped_column(Text, nullable=False, default="")
    soup_desc: Mapped[str] = mapped_column(Text, nullable=False, default="")
    aroma_desc: Mapped[str] = mapped_column(Text, nullable=False, default="")
    taste_desc: Mapped[str] = mapped_column(Text, nullable=False, default="")

    # 冲泡参考
    water_temp: Mapped[float | None] = mapped_column(Float, nullable=True)  # 摄氏度
    tea_amount: Mapped[float | None] = mapped_column(Float, nullable=True)  # 克
    brew_time: Mapped[float | None] = mapped_column(Float, nullable=True)    # 秒

    # 主图
    main_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # 状态
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    favorite_count: Mapped[int] = mapped_column(Integer, default=0, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关联
    tips: Mapped["TeaTips | None"] = relationship(back_populates="tea", uselist=False)


class TeaTips(Base):
    """官方小贴士（PRD §4.1 小贴士区）"""
    __tablename__ = "tea_tips"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tea_id: Mapped[int] = mapped_column(Integer, ForeignKey("teas.id", ondelete="CASCADE"), unique=True)

    history: Mapped[str | None] = mapped_column(Text, nullable=True)        # 历史典故
    suitable: Mapped[str | None] = mapped_column(Text, nullable=True)       # 适合人群
    misconception: Mapped[str | None] = mapped_column(Text, nullable=True)   # 冲泡误区
    official_note: Mapped[str | None] = mapped_column(Text, nullable=True)  # 品鉴笔记（官方）

    tea: Mapped[Tea] = relationship(back_populates="tips")
