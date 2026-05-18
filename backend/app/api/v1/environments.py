from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_user
from app.schemas import ActiveEnvironmentResponse, Environment, EnvironmentCreate, EnvironmentListResponse, EnvironmentProvisionRequest, SwitchActiveResponse
from app.services.environment_service import EnvironmentService
from app.services.environment_registry import EnvironmentRegistry

router = APIRouter(prefix="/environments", tags=["environments"], dependencies=[Depends(get_current_user)])


def get_registry() -> EnvironmentRegistry:
    return EnvironmentRegistry()


def get_environment_service() -> EnvironmentService:
    return EnvironmentService()


@router.post("", response_model=Environment)
def register_environment(payload: EnvironmentCreate, registry: EnvironmentRegistry = Depends(get_registry)) -> Environment:
    return registry.register_environment(payload)


@router.post("/create", response_model=Environment)
def create_environment(payload: EnvironmentProvisionRequest, service: EnvironmentService = Depends(get_environment_service)) -> Environment:
    return service.provision_postgres_environment(payload)


@router.get("", response_model=EnvironmentListResponse)
def list_environments(service: EnvironmentService = Depends(get_environment_service)) -> EnvironmentListResponse:
    return service.list_environments()


@router.post("/active/{environment_id}", response_model=SwitchActiveResponse)
def set_active_environment(environment_id: str, registry: EnvironmentRegistry = Depends(get_registry)) -> SwitchActiveResponse:
    return registry.set_active_environment(environment_id)


@router.get("/active", response_model=ActiveEnvironmentResponse)
def get_active_environment(registry: EnvironmentRegistry = Depends(get_registry)) -> ActiveEnvironmentResponse:
    return registry.get_active_environment()


@router.post("/{environment_id}/start", response_model=Environment)
def start_environment(environment_id: str, service: EnvironmentService = Depends(get_environment_service)) -> Environment:
    return service.start_environment(environment_id)


@router.post("/{environment_id}/stop", response_model=Environment)
def stop_environment(environment_id: str, service: EnvironmentService = Depends(get_environment_service)) -> Environment:
    return service.stop_environment(environment_id)


@router.delete("/{environment_id}", response_model=Environment)
def delete_environment(
    environment_id: str,
    remove_volume: bool = False,
    service: EnvironmentService = Depends(get_environment_service),
) -> Environment:
    return service.delete_environment(environment_id, remove_volume=remove_volume)
