import json
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException

from app.schemas import ActiveEnvironmentResponse, Environment, EnvironmentCreate, EnvironmentListResponse, SwitchActiveResponse

STATE_PATH = Path("/relaydb-state/environments.json")
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
        state = self._read_state()
        environment = Environment(id=str(uuid4()), **payload.model_dump())
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
        if self.list_environments().environments:
            return

        dev = self.register_environment(
            EnvironmentCreate(
                name="Local Dev Postgres",
                host="postgres-dev",
                port=5432,
                database="app",
                username="postgres",
                password="postgres",
            )
        )
        self.register_environment(
            EnvironmentCreate(
                name="QA Postgres",
                host="postgres-qa",
                port=5432,
                database="app",
                username="postgres",
                password="postgres",
            )
        )
        self.set_active_environment(dev.id)

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
