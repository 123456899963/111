"""茶品相关 Schema（响应 DTO，对齐 API_CONTRACT §2.2 / §2.3 / §2.3.1）

红线：schemas 不 import Model（ARCHITECTURE §3）；ORM → DTO 的转换
通过 from_attributes + model_validator 扁平化 tips_* 派生字段完成。
时间字段统一输出 ISO8601 UTC 带 Z（API_CONTRACT §1.7）。
"""

from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_serializer,
    field_validator,
    model_validator,
)

CATEGORY_VALUES = ("green", "white", "yellow", "red", "oolong", "dark")
SEASON_VALUES = ("明前", "雨前", "春茶", "夏茶", "秋茶", "冬茶")
FERMENTATION_VALUES = ("不发酵", "微发酵", "半发酵", "全发酵", "后发酵")
SORT_VALUES = ("newest", "favorite")

CategoryValue = Literal["green", "white", "yellow", "red", "oolong", "dark"]
SeasonValue = Literal["明前", "雨前", "春茶", "夏茶", "秋茶", "冬茶"]
FermentationValue = Literal["不发酵", "微发酵", "半发酵", "全发酵", "后发酵"]


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


def _normalize_optional_text(value: Any) -> Any:
    """选填文本：trim 后空串归一化为 None（API_CONTRACT §4.6.3）。"""
    if value is None or not isinstance(value, str):
        return value
    return value.strip() or None


def _normalize_required_text(value: Any, field: str) -> Any:
    """必填文本：trim 后必须非空。"""
    if not isinstance(value, str):
        return value
    normalized = value.strip()
    if not normalized:
        raise ValueError(f"{field} 不能为空")
    return normalized


def _one_decimal(value: Any) -> Any:
    """数值最多 1 位小数，且不超过目标精度。"""
    if value is None:
        return None
    try:
        decimal_value = Decimal(str(value))
    except (InvalidOperation, ValueError) as exc:
        raise ValueError("数值格式非法") from exc
    if decimal_value.as_tuple().exponent < -1:
        raise ValueError("数值最多保留 1 位小数")
    return float(decimal_value)


class TeaBaseRequest(BaseModel):
    """管理员茶品主体字段（新增/编辑共用，extra=forbid 防批量赋值 S-20）。"""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., max_length=100)
    category: CategoryValue
    origin: str = Field(..., max_length=200)
    season: SeasonValue | None = None
    fermentation: FermentationValue | None = None
    price_range: str | None = Field(None, max_length=32)
    representative_variety: str | None = Field(None, max_length=100)

    shape_desc: str
    soup_desc: str
    aroma_desc: str
    taste_desc: str

    water_temp: float = Field(..., ge=70.0, le=100.0)
    tea_amount: float = Field(..., gt=0, le=999.9)
    brew_time: float = Field(..., gt=0, le=999.9)

    main_image_url: str = Field(..., max_length=500)

    @field_validator("name", mode="before")
    @classmethod
    def _validate_name(cls, value: Any) -> Any:
        return _normalize_required_text(value, "name")

    @field_validator("origin", mode="before")
    @classmethod
    def _validate_origin(cls, value: Any) -> Any:
        return _normalize_required_text(value, "origin")

    @field_validator("shape_desc", "soup_desc", "aroma_desc", "taste_desc", mode="before")
    @classmethod
    def _validate_required_desc(cls, value: Any) -> Any:
        return _normalize_required_text(value, "感官描述")

    @field_validator(
        "season", "fermentation", "price_range", "representative_variety", mode="before"
    )
    @classmethod
    def _validate_optional_text(cls, value: Any) -> Any:
        return _normalize_optional_text(value)

    @field_validator("water_temp", "tea_amount", "brew_time", mode="before")
    @classmethod
    def _validate_number(cls, value: Any) -> Any:
        return _one_decimal(value)

    @field_validator("main_image_url")
    @classmethod
    def _validate_image_url(cls, value: str) -> str:
        if not (
            value.startswith("http://")
            or value.startswith("https://")
            or value.startswith("/uploads/")
        ):
            raise ValueError("main_image_url 必须为 http(s):// 或 /uploads/ 路径")
        return value


class TeaCreateRequest(TeaBaseRequest):
    """管理员新增茶品（API_CONTRACT §4.6.3）。"""

    tips_history: str | None = None
    tips_suitable: str | None = None
    tips_misconception: str | None = None
    tips_official_note: str | None = None

    @field_validator(
        "tips_history", "tips_suitable", "tips_misconception", "tips_official_note", mode="before"
    )
    @classmethod
    def _validate_tips(cls, value: Any) -> Any:
        return _normalize_optional_text(value)


class TeaUpdateRequest(TeaBaseRequest):
    """管理员编辑茶品（API_CONTRACT §4.6.4）：PUT 全量替换，不接受 tips_*。"""
