"""茶品相关 Schema（响应 DTO，对齐 API_CONTRACT §2.2 / §2.3 / §2.3.1）

红线：schemas 不 import Model（ARCHITECTURE §3）；ORM → DTO 的转换
通过 from_attributes + model_validator 扁平化 tips_* 派生字段完成。
时间字段统一输出 ISO8601 UTC 带 Z（API_CONTRACT §1.7）。
"""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, field_serializer, model_validator

CATEGORY_VALUES = ("green", "white", "yellow", "red", "oolong", "dark")
SEASON_VALUES = ("明前", "雨前", "春茶", "夏茶", "秋茶", "冬茶")
SORT_VALUES = ("newest", "favorite")


def _iso_z(v: datetime) -> str:
    """naive UTC DATETIME → 'YYYY-MM-DDTHH:mm:ssZ'"""
    return v.strftime("%Y-%m-%dT%H:%M:%SZ")


class TeaListItem(BaseModel):
    """公开列表卡片（API_CONTRACT §2.2）"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: str
    origin: str
    season: str | None = None
    main_image_url: str | None = None
    favorite_count: int = 0


class TeaListResponse(BaseModel):
    """分页结构（API_CONTRACT §1.6 / §4.2.1）"""

    items: list[TeaListItem]
    total: int
    page: int
    page_size: int


class TeaDetail(BaseModel):
    """茶品详情（API_CONTRACT §2.3）：含扁平化 tips_* 派生字段"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: str
    origin: str
    season: str | None = None
    fermentation: str | None = None
    price_range: str | None = None
    representative_variety: str | None = None

    shape_desc: str
    soup_desc: str
    aroma_desc: str
    taste_desc: str

    water_temp: float | None = None
    tea_amount: float | None = None
    brew_time: float | None = None

    main_image_url: str | None = None
    is_active: bool = True
    favorite_count: int = 0

    tips_history: str | None = None
    tips_suitable: str | None = None
    tips_misconception: str | None = None
    tips_official_note: str | None = None

    created_at: datetime
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def flatten_tips(cls, data: Any) -> Any:
        """ORM Tea 对象 → 扁平 DTO 输入：把 tea.tips.* 映射为 tips_*。"""
        # 仅处理带 SQLAlchemy 表结构的 ORM 对象；dict 直接放行
        if hasattr(data, "__table__"):
            columns = {c.name: getattr(data, c.name) for c in data.__table__.columns}
            tips = getattr(data, "tips", None)
            columns["tips_history"] = tips.history if tips else None
            columns["tips_suitable"] = tips.suitable if tips else None
            columns["tips_misconception"] = tips.misconception if tips else None
            columns["tips_official_note"] = tips.official_note if tips else None
            return columns
        return data

    @field_serializer("created_at", "updated_at")
    def serialize_datetime(self, v: datetime) -> str:
        return _iso_z(v)


class CategoryCount(BaseModel):
    """六大茶类计数（API_CONTRACT §2.3.1）"""

    category: Literal["green", "white", "yellow", "red", "oolong", "dark"]
    count: int


class OriginCount(BaseModel):
    """产地（省级）计数（API_CONTRACT §2.3.1）"""

    origin: str
    count: int


class TeaCreateRequest(BaseModel):
    """管理员新增茶品表单（MVP 必填字段）—— T4 阶段实现时补全校验"""

    name: str
    category: str
    origin: str

    # 选填
    season: str | None = None
    fermentation: str | None = None
    price_range: str | None = None
    representative_variety: str | None = None

    shape_desc: str = ""
    soup_desc: str = ""
    aroma_desc: str = ""
    taste_desc: str = ""

    water_temp: float | None = None
    tea_amount: float | None = None
    brew_time: float | None = None

    main_image_url: str | None = None

    # 小贴士（选填）
    tips_history: str | None = None
    tips_suitable: str | None = None
    tips_misconception: str | None = None
    tips_official_note: str | None = None
