from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=1)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class User(BaseModel):
    id: int
    email: str
    name: str
    created_at: str


class AuthResponse(BaseModel):
    user: User
    token: str
