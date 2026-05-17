from fastapi import APIRouter, Depends

from app.schemas import ActiveEnvironmentResponse, Environment, EnvironmentCreate, EnvironmentListResponse, SwitchActiveResponse
from app.services.environment_registry import EnvironmentRegistry

router = APIRouter(prefix="/environments", tags=["environments"])


def get_registry() -> EnvironmentRegistry:
    return EnvironmentRegistry()


@router.post("", response_model=Environment)
def register_environment(payload: EnvironmentCreate, registry: EnvironmentRegistry = Depends(get_registry)) -> Environment:
    return registry.register_environment(payload)


@router.get("", response_model=EnvironmentListResponse)
def list_environments(registry: EnvironmentRegistry = Depends(get_registry)) -> EnvironmentListResponse:
    return registry.list_environments()


@router.post("/active/{environment_id}", response_model=SwitchActiveResponse)
def set_active_environment(environment_id: str, registry: EnvironmentRegistry = Depends(get_registry)) -> SwitchActiveResponse:
    return registry.set_active_environment(environment_id)


@router.get("/active", response_model=ActiveEnvironmentResponse)
def get_active_environment(registry: EnvironmentRegistry = Depends(get_registry)) -> ActiveEnvironmentResponse:
    return registry.get_active_environment()
