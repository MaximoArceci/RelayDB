import re
from pathlib import Path

from fastapi import HTTPException

from app.core.settings import settings
from app.schemas.connections import ConnectionSlot, ConnectionSlotCreate, ConnectionSlotListResponse, ConnectionSlotUpdate
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
        environment = self.registry.find_environment(state, payload.target_environment_id)
        self.registry.find_project(state, payload.project_id)
        if environment.project_id != payload.project_id:
            raise HTTPException(status_code=400, detail="Connection target belongs to another project")

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
        project_id = state["active_project_id"]
        return ConnectionSlotListResponse(
            connections=[ConnectionSlot(**item) for item in state.get("connections", []) if item.get("project_id") == project_id]
        )

    def get_connection(self, connection_id: str) -> ConnectionSlot:
        state = self.registry.read_state()
        return self.find_connection(state, connection_id)

    def switch_connection(self, connection_id: str, environment_id: str) -> ConnectionSlot:
        state = self.registry.read_state()
        environment = self.registry.find_environment(state, environment_id)

        for index, item in enumerate(state.get("connections", [])):
            if item["id"] == connection_id:
                if item.get("project_id") != environment.project_id:
                    raise HTTPException(status_code=400, detail="Connection target belongs to another project")
                updated = {**item, "target_environment_id": environment_id, "status": "active"}
                state["connections"][index] = updated
                self.registry.write_state(state)
                return ConnectionSlot(**updated)

        raise HTTPException(status_code=404, detail="Connection not found")

    def update_connection(self, connection_id: str, payload: ConnectionSlotUpdate) -> ConnectionSlot:
        state = self.registry.read_state()
        changes = payload.model_dump(exclude_unset=True)

        if not changes:
            return self.find_connection(state, connection_id)

        target_environment_id = changes.get("target_environment_id")
        if target_environment_id is not None:
            environment = self.registry.find_environment(state, target_environment_id)
            next_project_id = changes.get("project_id")
            if next_project_id is not None:
                self.registry.find_project(state, next_project_id)
            for item in state.get("connections", []):
                if item["id"] == connection_id and environment.project_id != (next_project_id or item.get("project_id")):
                    raise HTTPException(status_code=400, detail="Connection target belongs to another project")

        stable_port = changes.get("stable_port")
        if stable_port is not None and any(
            item["id"] != connection_id and item["stable_port"] == stable_port for item in state.get("connections", [])
        ):
            raise HTTPException(status_code=409, detail="Stable port is already assigned to a connection")

        for index, item in enumerate(state.get("connections", [])):
            if item["id"] == connection_id:
                updated = {**item, **changes}
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
