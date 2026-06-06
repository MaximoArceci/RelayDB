import unittest

from fastapi import HTTPException

from app.schemas import EnvironmentProvisionRequest
from app.services.environment_service import EnvironmentService


class FakeRegistry:
    state_path = "/tmp/relaydb-test-state.json"

    def __init__(self) -> None:
        self.docker_was_called = False

    def read_state(self) -> dict:
        return {"projects": [{"id": "default", "name": "Default Project"}]}

    def find_project(self, state: dict, project_id: str) -> dict:
        for project in state["projects"]:
            if project["id"] == project_id:
                return project
        raise HTTPException(status_code=404, detail="Project not found")

    def save_environment(self, environment):
        return environment


class FakeDockerService:
    def __init__(self, registry: FakeRegistry) -> None:
        self.registry = registry

    def create_postgres_container(self, **kwargs):
        self.registry.docker_was_called = True
        raise AssertionError("Docker should not be called for an unknown project")


class EnvironmentServiceTests(unittest.TestCase):
    def test_invalid_project_is_rejected_before_docker_provisioning(self) -> None:
        registry = FakeRegistry()
        service = EnvironmentService(registry=registry, docker_service=FakeDockerService(registry))

        with self.assertRaises(HTTPException) as context:
            service.provision_postgres_environment(EnvironmentProvisionRequest(name="Bad", project_id="missing"))

        self.assertEqual(context.exception.status_code, 404)
        self.assertFalse(registry.docker_was_called)


if __name__ == "__main__":
    unittest.main()
