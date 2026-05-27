import re

from fastapi import HTTPException

from app.schemas.projects import ActiveProjectResponse, Project, ProjectCreate, ProjectListResponse
from app.services.environment_registry import DEFAULT_PROJECT_ID, EnvironmentRegistry


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "project"


class ProjectService:
    def __init__(self, registry: EnvironmentRegistry | None = None) -> None:
        self.registry = registry or EnvironmentRegistry()

    def list_projects(self) -> ProjectListResponse:
        state = self.registry.read_state()
        return ProjectListResponse(
            projects=[Project(**item) for item in state["projects"]],
            active_project_id=state["active_project_id"],
        )

    def get_active_project(self) -> ActiveProjectResponse:
        state = self.registry.read_state()
        return ActiveProjectResponse(project=self.find_project(state, state["active_project_id"]))

    def create_project(self, payload: ProjectCreate) -> Project:
        state = self.registry.read_state()
        project_id = slugify(payload.name)
        if any(item["id"] == project_id for item in state["projects"]):
            raise HTTPException(status_code=409, detail="Project id already exists")
        project = Project(id=project_id, **payload.model_dump())
        state["projects"].append(project.model_dump())
        state.setdefault("active_environment_ids", {}).setdefault(project.id, None)
        self.registry.write_state(state)
        return project

    def set_active_project(self, project_id: str) -> ActiveProjectResponse:
        state = self.registry.read_state()
        project = self.find_project(state, project_id)
        state["active_project_id"] = project.id
        state.setdefault("active_environment_ids", {}).setdefault(project.id, None)
        self.registry.write_state(state)
        return ActiveProjectResponse(project=project)

    def find_project(self, state: dict, project_id: str) -> Project:
        for item in state.get("projects", []):
            if item["id"] == project_id:
                return Project(**item)
        if project_id == DEFAULT_PROJECT_ID:
            return Project(id=DEFAULT_PROJECT_ID, name="Default Project")
        raise HTTPException(status_code=404, detail="Project not found")
