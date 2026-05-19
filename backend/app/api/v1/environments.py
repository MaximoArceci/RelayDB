from fastapi import APIRouter, Depends

from app.schemas import ActiveEnvironmentResponse, Environment, EnvironmentCreate, EnvironmentListResponse, EnvironmentProvisionRequest, Snapshot, SnapshotCreate, SqlExecutionRequest, SqlExecutionResponse, SwitchActiveResponse
from app.services.environment_service import EnvironmentService
from app.services.environment_registry import EnvironmentRegistry
from app.services.snapshot_service import SnapshotService
from app.services.sql_service import SqlService

router = APIRouter(prefix="/environments", tags=["environments"])


def get_registry() -> EnvironmentRegistry:
    return EnvironmentRegistry()


def get_environment_service() -> EnvironmentService:
    return EnvironmentService()


def get_sql_service() -> SqlService:
    return SqlService()


def get_snapshot_service() -> SnapshotService:
    return SnapshotService()


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


@router.post("/{environment_id}/sql", response_model=SqlExecutionResponse)
def execute_sql(
    environment_id: str,
    payload: SqlExecutionRequest,
    service: SqlService = Depends(get_sql_service),
) -> SqlExecutionResponse:
    return service.execute(environment_id, payload.sql)


@router.post("/{environment_id}/snapshots", response_model=Snapshot)
def create_snapshot(
    environment_id: str,
    payload: SnapshotCreate,
    service: SnapshotService = Depends(get_snapshot_service),
) -> Snapshot:
    return service.create_snapshot(environment_id, payload.name)


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
