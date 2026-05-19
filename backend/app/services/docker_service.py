from dataclasses import dataclass
import io
import tarfile

import docker
from docker.errors import APIError, NotFound

POSTGRES_IMAGE = "postgres:16"
POSTGRES_DATA_PATH = "/var/lib/postgresql/data"
RELAYDB_NETWORK = "relaydb-network"


@dataclass
class ProvisionedPostgres:
    container_name: str
    volume_name: str
    host: str
    port: int
    status: str


class DockerService:
    def __init__(self) -> None:
        self.client = docker.from_env()

    def ensure_network(self, name: str = RELAYDB_NETWORK) -> None:
        try:
            self.client.networks.get(name)
        except NotFound:
            self.client.networks.create(name, driver="bridge")

    def create_postgres_container(
        self,
        *,
        environment_id: str,
        container_name: str,
        volume_name: str,
        database: str,
        username: str,
        password: str,
    ) -> ProvisionedPostgres:
        self.ensure_network()
        volume = self.client.volumes.create(
            name=volume_name,
            labels={
                "relaydb.managed": "true",
                "relaydb.environment_id": environment_id,
            },
        )
        try:
            container = self.client.containers.run(
                POSTGRES_IMAGE,
                name=container_name,
                detach=True,
                environment={
                    "POSTGRES_DB": database,
                    "POSTGRES_USER": username,
                    "POSTGRES_PASSWORD": password,
                },
                labels={
                    "relaydb.managed": "true",
                    "relaydb.environment_id": environment_id,
                },
                network=RELAYDB_NETWORK,
                volumes={volume_name: {"bind": POSTGRES_DATA_PATH, "mode": "rw"}},
            )
        except Exception:
            volume.remove(force=True)
            raise
        container.reload()
        return ProvisionedPostgres(
            container_name=container_name,
            volume_name=volume_name,
            host=container_name,
            port=5432,
            status=container.status,
        )

    def get_container_status(self, container_name: str) -> str:
        try:
            container = self.client.containers.get(container_name)
            container.reload()
            return container.status
        except NotFound:
            return "missing"
        except APIError:
            return "unknown"

    def start_container(self, container_name: str) -> str:
        container = self.client.containers.get(container_name)
        container.start()
        container.reload()
        return container.status

    def stop_container(self, container_name: str) -> str:
        container = self.client.containers.get(container_name)
        container.stop()
        container.reload()
        return container.status

    def delete_postgres_container(self, container_name: str, volume_name: str, remove_volume: bool) -> None:
        try:
            container = self.client.containers.get(container_name)
            container.remove(force=True)
        except NotFound:
            pass

        if remove_volume:
            try:
                volume = self.client.volumes.get(volume_name)
                volume.remove(force=True)
            except NotFound:
                pass

    def dump_postgres_database(self, container_name: str, database: str, username: str, password: str) -> bytes:
        container = self.client.containers.get(container_name)
        exit_code, output = container.exec_run(
            ["sh", "-lc", f"PGPASSWORD='{password}' pg_dump -U '{username}' -d '{database}' -Fc"],
            demux=False,
        )
        if exit_code != 0:
            raise APIError(f"pg_dump failed: {output.decode('utf-8', errors='replace')}")
        return output

    def restore_postgres_database(
        self,
        container_name: str,
        database: str,
        username: str,
        password: str,
        dump_bytes: bytes,
    ) -> None:
        container = self.client.containers.get(container_name)
        dump_path = "/tmp/relaydb-snapshot.dump"
        archive = io.BytesIO()
        with tarfile.open(fileobj=archive, mode="w") as tar:
            info = tarfile.TarInfo(name="relaydb-snapshot.dump")
            info.size = len(dump_bytes)
            tar.addfile(info, io.BytesIO(dump_bytes))
        archive.seek(0)
        container.put_archive("/tmp", archive.read())
        command = (
            f"PGPASSWORD='{password}' dropdb -U '{username}' --if-exists '{database}' && "
            f"PGPASSWORD='{password}' createdb -U '{username}' '{database}' && "
            f"PGPASSWORD='{password}' pg_restore -U '{username}' -d '{database}' '{dump_path}' && "
            f"rm -f '{dump_path}'"
        )
        exit_code, output = container.exec_run(["sh", "-lc", command], demux=False)
        if exit_code != 0:
            raise APIError(f"pg_restore failed: {output.decode('utf-8', errors='replace')}")
