"""清单与品鉴笔记 Schema（API_CONTRACT §2.5 / §4.4）"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_serializer

from app.schemas._common import iso_z


class ShareBrief(BaseModel):
    """当前生效分享摘要（§2.5）"""

    token: str
    url: str
    created_at: datetime

    @field_serializer("created_at")
    def serialize_created_at(self, v: datetime) -> str:
        return iso_z(v)


class ListItem(BaseModel):
    """清单条目（含私有笔记，仅所有者可见）"""

    tea_id: int
    name: str
    category: str
    origin: str
    season: str | None = None
    main_image_url: str | None = None
    favorite_count: int = 0
    is_available: bool = True
    tasting_note: str | None = None
    favorited_at: datetime

    @field_serializer("favorited_at")
    def serialize_favorited_at(self, v: datetime) -> str:
        return iso_z(v)


class ListData(BaseModel):
    """默认清单（§4.4.1）"""

    id: int
    title: str
    tea_count: int
    created_at: datetime
    updated_at: datetime
    share: ShareBrief | None = None
    items: list[ListItem]

    @field_serializer("created_at", "updated_at")
    def serialize_datetime(self, v: datetime) -> str:
        return iso_z(v)


class TitleUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str


class TitleUpdateData(BaseModel):
    id: int
    title: str
    updated_at: datetime

    @field_serializer("updated_at")
    def serialize_updated_at(self, v: datetime) -> str:
        return iso_z(v)


class NoteUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content: str | None


class NoteUpdateData(BaseModel):
    tea_id: int
    tasting_note: str | None
