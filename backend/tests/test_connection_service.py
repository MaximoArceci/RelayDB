import unittest

from fastapi import HTTPException

from app.services.connection_service import ConnectionService
from app.schemas.connections import ConnectionSlotUpdate


class FakeRegistry:
    def __init__(self) -> None:
        self.state = {
            "projects": [
                {"id": "default", "name": "Default Project"},
                {"id": "analytics", "name": "Analytics"},
            ],
            "environments": [
                {
                    "id": "env-default",
                    "name": "Default DB",
                    "host": "postgres-default",
                    "port": 5432,
                    "database": "app",
                    "username": "postgres",
                    "password": "postgres",
                    "project_id": "default",
                }
            ],
            "connections": [
                {
                    "id": "main",
                    "name": "Main",
                    "owner": "Team",
                    "stable_port": 15432,
                    "target_environment_id": "env-default",
                    "project_id": "default",
                    "status": "active",
                }
            ],
        }

    def read_state(self) -> dict:
        return self.state

    def write_state(self, state: dict) -> None:
        self.state = state

    def find_project(self, state: dict, project_id: str) -> dict:
        for project in state["projects"]:
            if project["id"] == project_id:
                return project
        raise HTTPException(status_code=404, detail="Project not found")

    def find_environment(self, state: dict, environment_id: str):
        for environment in state["environments"]:
            if environment["id"] == environment_id:
                return type("Environment", (), environment)
        raise HTTPException(status_code=404, detail="Environment not found")


class ConnectionServiceTests(unittest.TestCase):
    def test_connection_project_cannot_change_without_matching_target_environment(self) -> None:
        registry = FakeRegistry()
        service = ConnectionService(registry=registry)

        with self.assertRaises(HTTPException) as context:
            service.update_connection("main", ConnectionSlotUpdate(project_id="analytics"))

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(registry.state["connections"][0]["project_id"], "default")


if __name__ == "__main__":
    unittest.main()
