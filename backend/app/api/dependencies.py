from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.schemas import User
from app.services.user_service import UserService

bearer_scheme = HTTPBearer()


def get_user_service() -> UserService:
    return UserService()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    user_service: UserService = Depends(get_user_service),
) -> User:
    user = user_service.get_user_by_token(credentials.credentials)
    return User(id=user.id, email=user.email, name=user.name, created_at=user.created_at)
