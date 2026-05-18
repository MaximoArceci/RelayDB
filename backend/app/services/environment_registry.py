import json
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException

from app.schemas import ActiveEnvironmentResponse, Environment, EnvironmentCreate, EnvironmentListResponse, SwitchActiveResponse
from app.core.settings import settings

STATE_PATH = Path(settings.state_path)
STABLE_ENDPOINT = "localhost:5432"


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
            self._write_state({"environments": [], "active_environment_id": None})

    def register_environment(self, payload: EnvironmentCreate) -> Environment:
        environment = Environment(id=str(uuid4()), status="external", managed=False, **payload.model_dump())
        return self.save_environment(environment)

    def save_environment(self, environment: Environment) -> Environment:
        state = self._read_state()
        state["environments"].append(environment.model_dump())

        if state["active_environment_id"] is None:
            state["active_environment_id"] = environment.id

        self._write_state(state)
        return environment

    def list_environments(self) -> EnvironmentListResponse:
        state = self._read_state()
        return EnvironmentListResponse(
            environments=[Environment(**item) for item in state["environments"]],
            active_environment_id=state["active_environment_id"],
        )

    def get_environment(self, environment_id: str) -> Environment:
        state = self._read_state()
        return self._find_environment(state, environment_id)

    def get_active_environment(self) -> ActiveEnvironmentResponse:
        state = self._read_state()
        environment = self._find_active(state)
        return ActiveEnvironmentResponse(environment=environment, stable_endpoint=STABLE_ENDPOINT)

    def set_active_environment(self, environment_id: str) -> SwitchActiveResponse:
        state = self._read_state()
        environment = self._find_environment(state, environment_id)
        state["active_environment_id"] = environment.id
        self._write_state(state)
        return SwitchActiveResponse(active=environment, stable_endpoint=STABLE_ENDPOINT)

    def seed_examples_if_empty(self) -> None:
        return

    def update_environment(self, environment_id: str, changes: dict) -> Environment:
        state = self._read_state()
        for index, item in enumerate(state["environments"]):
            if item["id"] == environment_id:
                updated = {**item, **changes}
                state["environments"][index] = updated
                self._write_state(state)
                return Environment(**updated)
        raise HTTPException(status_code=404, detail="Environment not found")

    def delete_environment(self, environment_id: str) -> Environment:
        state = self._read_state()
        environment = self._find_environment(state, environment_id)
        state["environments"] = [item for item in state["environments"] if item["id"] != environment_id]
        if state["active_environment_id"] == environment_id:
            state["active_environment_id"] = state["environments"][0]["id"] if state["environments"] else None
        self._write_state(state)
        return environment

    def _find_active(self, state: dict) -> Environment | None:
        active_id = state["active_environment_id"]
        if active_id is None:
            return None
        return self._find_environment(state, active_id)

    def _find_environment(self, state: dict, environment_id: str) -> Environment:
        for item in state["environments"]:
            if item["id"] == environment_id:
                return Environment(**item)
        raise HTTPException(status_code=404, detail="Environment not found")

    def _read_state(self) -> dict:
        with self.state_path.open("r", encoding="utf-8") as file:
            return json.load(file)

    def _write_state(self, state: dict) -> None:
        tmp_path = self.state_path.with_suffix(".tmp")
        with tmp_path.open("w", encoding="utf-8") as file:
            json.dump(state, file, indent=2)
        tmp_path.replace(self.state_path)
