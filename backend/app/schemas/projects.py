from datetime import UTC, datetime

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1)
    description: str = ""


class Project(BaseModel):
    id: str
    name: str
    description: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class ProjectListResponse(BaseModel):
    projects: list[Project]
    active_project_id: str


class ActiveProjectResponse(BaseModel):
    project: Project
