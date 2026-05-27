import re
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from docker.errors import APIError, DockerException, NotFound
from fastapi import HTTPException

from app.schemas import Environment, EnvironmentListResponse, EnvironmentProvisionRequest
from app.services.docker_service import DockerService
from app.services.environment_registry import EnvironmentRegistry

RELAYDB_DATABASE = "app"
RELAYDB_USERNAME = "postgres"
RELAYDB_PASSWORD = "postgres"


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "environment"


class EnvironmentService:
    def __init__(
        self,
        registry: EnvironmentRegistry | None = None,
        docker_service: DockerService | None = None,
    ) -> None:
        self.registry = registry or EnvironmentRegistry()
        self.docker_service = docker_service or DockerService()

    def provision_postgres_environment(self, payload: EnvironmentProvisionRequest) -> Environment:
        environment_id = str(uuid4())
        suffix = environment_id.split("-")[0]
        slug = slugify(payload.name)
        container_name = f"relaydb-postgres-{slug}-{suffix}"
        volume_name = f"relaydb-volume-{slug}-{suffix}"

        try:
            provisioned = self.docker_service.create_postgres_container(
                environment_id=environment_id,
                container_name=container_name,
                volume_name=volume_name,
                database=RELAYDB_DATABASE,
                username=RELAYDB_USERNAME,
                password=RELAYDB_PASSWORD,
            )
        except (APIError, DockerException) as exc:
            raise HTTPException(status_code=502, detail=f"Docker provisioning failed: {exc}") from exc

        environment = Environment(
            id=environment_id,
            project_id=payload.project_id,
            name=payload.name,
            host=provisioned.host,
            port=provisioned.port,
            database=RELAYDB_DATABASE,
            username=RELAYDB_USERNAME,
            password=RELAYDB_PASSWORD,
            container_name=provisioned.container_name,
            volume_name=provisioned.volume_name,
            status=provisioned.status,
            created_at=datetime.now(UTC).isoformat(),
            managed=True,
        )
        return self.registry.save_environment(environment)

    def list_environments(self) -> EnvironmentListResponse:
        self.refresh_runtime_metadata()
        return self.registry.list_environments()

    def start_environment(self, environment_id: str) -> Environment:
        environment = self.registry.get_environment(environment_id)
        if not environment.container_name:
            raise HTTPException(status_code=400, detail="Environment is not managed by RelayDB")

        try:
            status = self.docker_service.start_container(environment.container_name)
        except NotFound as exc:
            raise HTTPException(status_code=404, detail="PostgreSQL container not found") from exc
        except (APIError, DockerException) as exc:
            raise HTTPException(status_code=502, detail=f"Docker start failed: {exc}") from exc

        return self.registry.update_environment(environment_id, {"status": status})

    def stop_environment(self, environment_id: str) -> Environment:
        environment = self.registry.get_environment(environment_id)
        if not environment.container_name:
            raise HTTPException(status_code=400, detail="Environment is not managed by RelayDB")

        try:
            status = self.docker_service.stop_container(environment.container_name)
        except NotFound as exc:
            raise HTTPException(status_code=404, detail="PostgreSQL container not found") from exc
        except (APIError, DockerException) as exc:
            raise HTTPException(status_code=502, detail=f"Docker stop failed: {exc}") from exc

        return self.registry.update_environment(environment_id, {"status": status})

    def delete_environment(self, environment_id: str, remove_volume: bool) -> Environment:
        environment = self.registry.get_environment(environment_id)
        if environment.container_name and environment.volume_name:
            try:
                self.docker_service.delete_postgres_container(
                    environment.container_name,
                    environment.volume_name,
                    remove_volume=remove_volume,
                )
            except (APIError, DockerException) as exc:
                raise HTTPException(status_code=502, detail=f"Docker delete failed: {exc}") from exc

        return self.registry.delete_environment(environment_id)

    def refresh_runtime_metadata(self) -> None:
        state_path = Path(self.registry.state_path)
        if not state_path.exists():
            return

        for environment in self.registry.list_environments().environments:
            if not environment.container_name:
                continue
            status = self.docker_service.get_container_status(environment.container_name)
            self.registry.update_environment(environment.id, {"status": status})
