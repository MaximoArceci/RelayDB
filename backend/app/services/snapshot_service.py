import json
import re
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from docker.errors import APIError, DockerException, NotFound
from fastapi import HTTPException

from app.core.settings import settings
from app.schemas import Snapshot, SnapshotListResponse
from app.services.docker_service import DockerService
from app.services.environment_registry import EnvironmentRegistry


def snapshot_slug(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "snapshot"


class SnapshotService:
    def __init__(
        self,
        registry: EnvironmentRegistry | None = None,
        docker_service: DockerService | None = None,
        snapshots_path: Path = Path(settings.snapshots_path),
        metadata_path: Path = Path(settings.snapshots_metadata_path),
    ) -> None:
        self.registry = registry or EnvironmentRegistry()
        self.docker_service = docker_service or DockerService()
        self.snapshots_path = snapshots_path
        self.metadata_path = metadata_path
        self.snapshots_path.mkdir(parents=True, exist_ok=True)
        self.metadata_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.metadata_path.exists():
            self._write_state({"snapshots": []})

    def create_snapshot(self, environment_id: str, name: str) -> Snapshot:
        environment = self.registry.get_environment(environment_id)
        if not environment.container_name:
            raise HTTPException(status_code=400, detail="Snapshots require a RelayDB-managed PostgreSQL container")
        snapshot_id = str(uuid4())
        file_name = f"{snapshot_slug(name)}-{snapshot_id.split('-')[0]}.dump"
        file_path = self.snapshots_path / file_name

        try:
            dump = self.docker_service.dump_postgres_database(
                environment.container_name,
                environment.database,
                environment.username,
                environment.password,
            )
        except (APIError, DockerException, NotFound) as exc:
            raise HTTPException(status_code=502, detail=f"Snapshot creation failed: {exc}") from exc

        file_path.write_bytes(dump)
        snapshot = Snapshot(
            id=snapshot_id,
            environment_id=environment.id,
            environment_name=environment.name,
            snapshot_name=name,
            file_path=str(file_path),
            created_at=datetime.now(UTC).isoformat(),
            size_bytes=file_path.stat().st_size,
        )
        state = self._read_state()
        state["snapshots"].append(snapshot.model_dump())
        self._write_state(state)
        return snapshot

    def list_snapshots(self) -> SnapshotListResponse:
        state = self._read_state()
        return SnapshotListResponse(snapshots=[Snapshot(**item) for item in state["snapshots"]])

    def restore_snapshot(self, snapshot_id: str, environment_id: str) -> Snapshot:
        snapshot = self.get_snapshot(snapshot_id)
        target = self.registry.get_environment(environment_id)
        if not target.container_name:
            raise HTTPException(status_code=400, detail="Restore requires a RelayDB-managed PostgreSQL container")
        file_path = Path(snapshot.file_path)
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Snapshot dump file not found")

        try:
            self.docker_service.restore_postgres_database(
                target.container_name,
                target.database,
                target.username,
                target.password,
                file_path.read_bytes(),
            )
        except (APIError, DockerException, NotFound) as exc:
            raise HTTPException(status_code=502, detail=f"Snapshot restore failed: {exc}") from exc

        return snapshot

    def delete_snapshot(self, snapshot_id: str) -> Snapshot:
        state = self._read_state()
        snapshot = self.get_snapshot(snapshot_id)
        file_path = Path(snapshot.file_path)
        if file_path.exists():
            file_path.unlink()
        state["snapshots"] = [item for item in state["snapshots"] if item["id"] != snapshot_id]
        self._write_state(state)
        return snapshot

    def get_snapshot(self, snapshot_id: str) -> Snapshot:
        for snapshot in self.list_snapshots().snapshots:
            if snapshot.id == snapshot_id:
                return snapshot
        raise HTTPException(status_code=404, detail="Snapshot not found")

    def _read_state(self) -> dict:
        with self.metadata_path.open("r", encoding="utf-8") as file:
            return json.load(file)

    def _write_state(self, state: dict) -> None:
        tmp_path = self.metadata_path.with_suffix(".tmp")
        with tmp_path.open("w", encoding="utf-8") as file:
            json.dump(state, file, indent=2)
        tmp_path.replace(self.metadata_path)
