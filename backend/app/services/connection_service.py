import re
from pathlib import Path

from fastapi import HTTPException

from app.core.settings import settings
from app.schemas.connections import ConnectionSlot, ConnectionSlotCreate, ConnectionSlotListResponse
from app.services.environment_registry import EnvironmentRegistry


STATE_PATH = Path(settings.state_path)


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "connection"


class ConnectionService:
    def __init__(self, registry: EnvironmentRegistry | None = None) -> None:
        self.registry = registry or EnvironmentRegistry()

    def create_connection(self, payload: ConnectionSlotCreate) -> ConnectionSlot:
        state = self.registry.read_state()
        self.registry.find_environment(state, payload.target_environment_id)

        if any(item["stable_port"] == payload.stable_port for item in state.get("connections", [])):
            raise HTTPException(status_code=409, detail="Stable port is already assigned to a connection")

        connection_id = slugify(payload.name)
        if any(item["id"] == connection_id for item in state.get("connections", [])):
            raise HTTPException(status_code=409, detail="Connection id already exists")

        connection = ConnectionSlot(id=connection_id, **payload.model_dump())
        state.setdefault("connections", []).append(connection.model_dump())
        self.registry.write_state(state)
        return connection

    def list_connections(self) -> ConnectionSlotListResponse:
        state = self.registry.read_state()
        return ConnectionSlotListResponse(connections=[ConnectionSlot(**item) for item in state.get("connections", [])])

    def get_connection(self, connection_id: str) -> ConnectionSlot:
        state = self.registry.read_state()
        return self.find_connection(state, connection_id)

    def switch_connection(self, connection_id: str, environment_id: str) -> ConnectionSlot:
        state = self.registry.read_state()
        self.registry.find_environment(state, environment_id)

        for index, item in enumerate(state.get("connections", [])):
            if item["id"] == connection_id:
                updated = {**item, "target_environment_id": environment_id, "status": "active"}
                state["connections"][index] = updated
                self.registry.write_state(state)
                return ConnectionSlot(**updated)

        raise HTTPException(status_code=404, detail="Connection not found")

    def delete_connection(self, connection_id: str) -> ConnectionSlot:
        state = self.registry.read_state()
        connection = self.find_connection(state, connection_id)
        state["connections"] = [item for item in state.get("connections", []) if item["id"] != connection_id]
        self.registry.write_state(state)
        return connection

    def find_connection(self, state: dict, connection_id: str) -> ConnectionSlot:
        for item in state.get("connections", []):
            if item["id"] == connection_id:
                return ConnectionSlot(**item)
        raise HTTPException(status_code=404, detail="Connection not found")
