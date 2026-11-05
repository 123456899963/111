from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=20, description="用户名 3-20 字符")
    password: str = Field(min_length=6, description="密码至少 6 位")


class LoginRequest(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    role: str = "user"

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    user_id: int
    username: str
