"""收藏相关 Schema（API_CONTRACT §4.3 FavoriteState）"""

from pydantic import BaseModel, ConfigDict


class FavoriteState(BaseModel):
    """收藏状态 + 茶品缓存收藏数（§4.3.1 ~ §4.3.3）"""

    model_config = ConfigDict(from_attributes=True)

    tea_id: int
    is_favorited: bool
    favorite_count: int
