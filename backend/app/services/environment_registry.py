import json
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException

from app.schemas import ActiveEnvironmentResponse, Environment, EnvironmentCreate, EnvironmentListResponse, SwitchActiveResponse
from app.core.settings import settings

STATE_PATH = Path(settings.state_path)
STABLE_ENDPOINT = "localhost:5432"
DEFAULT_PROJECT_ID = "default"
DEFAULT_PROJECT = {
    "id": DEFAULT_PROJECT_ID,
    "name": "Default Project",
    "description": "Workspace for existing RelayDB environments.",
    "created_at": "2026-01-01T00:00:00+00:00",
}


class EnvironmentRegistry:
    """Small control-plane registry shared with the TCP router.

    The backend writes the registered environments and active target to a JSON
    state file mounted into both containers. The router reads this file when a
    new TCP connection arrives, so target changes affect new connections without
    restarting either service.
    """

    def __init__(self, state_path: Path = STATE_PATH) -> None:
        self.state_path = state_path
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.state_path.exists():
            self.write_state(
                {
                    "projects": [DEFAULT_PROJECT],
                    "active_project_id": DEFAULT_PROJECT_ID,
                    "environments": [],
                    "active_environment_id": None,
                    "active_environment_ids": {DEFAULT_PROJECT_ID: None},
                    "connections": [],
                }
            )

    def register_environment(self, payload: EnvironmentCreate) -> Environment:
        environment = Environment(id=str(uuid4()), status="external", managed=False, **payload.model_dump())
        return self.save_environment(environment)

    def save_environment(self, environment: Environment) -> Environment:
        state = self.read_state()
        state.setdefault("connections", [])
        self.find_project(state, environment.project_id)
        state["environments"].append(environment.model_dump())

        active_environment_ids = state.setdefault("active_environment_ids", {})
        if active_environment_ids.get(environment.project_id) is None:
            active_environment_ids[environment.project_id] = environment.id
        if state["active_environment_id"] is None:
            state["active_environment_id"] = environment.id

        self.write_state(state)
        return environment

    def list_environments(self) -> EnvironmentListResponse:
        state = self.read_state()
        project_id = state["active_project_id"]
        return EnvironmentListResponse(
            environments=[Environment(**item) for item in state["environments"] if item.get("project_id", DEFAULT_PROJECT_ID) == project_id],
            active_environment_id=state.get("active_environment_ids", {}).get(project_id),
        )

    def get_environment(self, environment_id: str) -> Environment:
        state = self.read_state()
        return self.find_environment(state, environment_id)

    def get_active_environment(self) -> ActiveEnvironmentResponse:
        state = self.read_state()
        environment = self._find_active(state)
        return ActiveEnvironmentResponse(environment=environment, stable_endpoint=STABLE_ENDPOINT)

    def set_active_environment(self, environment_id: str) -> SwitchActiveResponse:
        state = self.read_state()
        environment = self.find_environment(state, environment_id)
        if environment.project_id != state["active_project_id"]:
            raise HTTPException(status_code=400, detail="Environment belongs to another project")
        state["active_environment_id"] = environment.id
        state.setdefault("active_environment_ids", {})[environment.project_id] = environment.id
        self.write_state(state)
        return SwitchActiveResponse(active=environment, stable_endpoint=STABLE_ENDPOINT)

    def seed_examples_if_empty(self) -> None:
        return

    def update_environment(self, environment_id: str, changes: dict) -> Environment:
        state = self.read_state()
        for index, item in enumerate(state["environments"]):
            if item["id"] == environment_id:
                updated = {**item, **changes}
                state["environments"][index] = updated
                self.write_state(state)
                return Environment(**updated)
        raise HTTPException(status_code=404, detail="Environment not found")

    def delete_environment(self, environment_id: str) -> Environment:
        state = self.read_state()
        environment = self.find_environment(state, environment_id)
        state["environments"] = [item for item in state["environments"] if item["id"] != environment_id]
        if state["active_environment_id"] == environment_id:
            state["active_environment_id"] = state["environments"][0]["id"] if state["environments"] else None
        active_environment_ids = state.setdefault("active_environment_ids", {})
        if active_environment_ids.get(environment.project_id) == environment_id:
            next_environment = next(
                (item for item in state["environments"] if item.get("project_id", DEFAULT_PROJECT_ID) == environment.project_id),
                None,
            )
            active_environment_ids[environment.project_id] = next_environment["id"] if next_environment else None
        for connection in state.get("connections", []):
            if connection["target_environment_id"] == environment_id:
                connection["status"] = "target_missing"
        self.write_state(state)
        return environment

    def _find_active(self, state: dict) -> Environment | None:
        active_id = state.get("active_environment_ids", {}).get(state["active_project_id"]) or state["active_environment_id"]
        if active_id is None:
            return None
        environment = self.find_environment(state, active_id)
        if environment.project_id != state["active_project_id"]:
            return None
        return environment

    def find_environment(self, state: dict, environment_id: str) -> Environment:
        for item in state["environments"]:
            if item["id"] == environment_id:
                return Environment(**item)
        raise HTTPException(status_code=404, detail="Environment not found")

    def find_project(self, state: dict, project_id: str) -> dict:
        for item in state.get("projects", []):
            if item["id"] == project_id:
                return item
        raise HTTPException(status_code=404, detail="Project not found")

    def read_state(self) -> dict:
        with self.state_path.open("r", encoding="utf-8") as file:
            state = json.load(file)
        return self._normalize_state(state)

    def _normalize_state(self, state: dict) -> dict:
        state.setdefault("projects", [DEFAULT_PROJECT])
        if not state["projects"]:
            state["projects"].append(DEFAULT_PROJECT)
        state.setdefault("active_project_id", state["projects"][0]["id"])
        if not any(item["id"] == state["active_project_id"] for item in state["projects"]):
            state["active_project_id"] = state["projects"][0]["id"]

        state.setdefault("environments", [])
        state.setdefault("active_environment_id", None)
        state.setdefault("active_environment_ids", {})
        state.setdefault("connections", [])
        for item in state["environments"]:
            item.setdefault("project_id", DEFAULT_PROJECT_ID)
        for item in state["connections"]:
            item.setdefault("project_id", DEFAULT_PROJECT_ID)
        for project in state["projects"]:
            state["active_environment_ids"].setdefault(project["id"], None)
        if state["active_environment_id"] and state["active_environment_ids"].get(DEFAULT_PROJECT_ID) is None:
            state["active_environment_ids"][DEFAULT_PROJECT_ID] = state["active_environment_id"]
        return state

    def write_state(self, state: dict) -> None:
        state = self._normalize_state(state)
        tmp_path = self.state_path.with_suffix(".tmp")
        with tmp_path.open("w", encoding="utf-8") as file:
            json.dump(state, file, indent=2)
        tmp_path.replace(self.state_path)
