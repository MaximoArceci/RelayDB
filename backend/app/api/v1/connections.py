from fastapi import APIRouter, Depends

from app.schemas.connections import ConnectionSlot, ConnectionSlotCreate, ConnectionSlotListResponse
from app.services.connection_service import ConnectionService

router = APIRouter(prefix="/connections", tags=["connections"])


def get_connection_service() -> ConnectionService:
    return ConnectionService()


@router.post("", response_model=ConnectionSlot)
def create_connection(
    payload: ConnectionSlotCreate,
    service: ConnectionService = Depends(get_connection_service),
) -> ConnectionSlot:
    return service.create_connection(payload)


@router.get("", response_model=ConnectionSlotListResponse)
def list_connections(service: ConnectionService = Depends(get_connection_service)) -> ConnectionSlotListResponse:
    return service.list_connections()


@router.get("/{connection_id}", response_model=ConnectionSlot)
def get_connection(
    connection_id: str,
    service: ConnectionService = Depends(get_connection_service),
) -> ConnectionSlot:
    return service.get_connection(connection_id)


@router.post("/{connection_id}/switch/{environment_id}", response_model=ConnectionSlot)
def switch_connection(
    connection_id: str,
    environment_id: str,
    service: ConnectionService = Depends(get_connection_service),
) -> ConnectionSlot:
    return service.switch_connection(connection_id, environment_id)


@router.delete("/{connection_id}", response_model=ConnectionSlot)
def delete_connection(
    connection_id: str,
    service: ConnectionService = Depends(get_connection_service),
) -> ConnectionSlot:
    return service.delete_connection(connection_id)
