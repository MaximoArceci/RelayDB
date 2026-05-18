from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials

from app.api.dependencies import bearer_scheme, get_current_user, get_user_service
from app.schemas import AuthResponse, User, UserCreate, UserLogin
from app.services.user_service import UserService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse)
def register(payload: UserCreate, user_service: UserService = Depends(get_user_service)) -> AuthResponse:
    user, token = user_service.register_user(payload.email, payload.password, payload.name)
    return AuthResponse(user=User(id=user.id, email=user.email, name=user.name, created_at=user.created_at), token=token)


@router.post("/login", response_model=AuthResponse)
def login(payload: UserLogin, user_service: UserService = Depends(get_user_service)) -> AuthResponse:
    user, token = user_service.authenticate_user(payload.email, payload.password)
    return AuthResponse(user=User(id=user.id, email=user.email, name=user.name, created_at=user.created_at), token=token)


@router.get("/me", response_model=User)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.post("/logout")
def logout(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    user_service: UserService = Depends(get_user_service),
) -> dict[str, str]:
    user_service.delete_session(credentials.credentials)
    return {"status": "ok"}
