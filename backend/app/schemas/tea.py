from pydantic import BaseModel, ConfigDict
from datetime import datetime


class TeaResponse(BaseModel):
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

    model_config = ConfigDict(from_attributes=True)


class TeaListItem(BaseModel):
    id: int
    name: str
    category: str
    origin: str
    season: str | None = None
    main_image_url: str | None = None
    favorite_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class TeaListResponse(BaseModel):
    items: list[TeaListItem]
    total: int
    page: int
    page_size: int


class TeaCreateRequest(BaseModel):
    """管理员新增茶品表单（MVP 必填字段）"""
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
