from fastapi import APIRouter, Depends

from app.schemas.projects import ActiveProjectResponse, Project, ProjectCreate, ProjectListResponse
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])


def get_project_service() -> ProjectService:
    return ProjectService()


@router.get("", response_model=ProjectListResponse)
def list_projects(service: ProjectService = Depends(get_project_service)) -> ProjectListResponse:
    return service.list_projects()


@router.post("", response_model=Project)
def create_project(payload: ProjectCreate, service: ProjectService = Depends(get_project_service)) -> Project:
    return service.create_project(payload)


@router.get("/active", response_model=ActiveProjectResponse)
def get_active_project(service: ProjectService = Depends(get_project_service)) -> ActiveProjectResponse:
    return service.get_active_project()


@router.post("/active/{project_id}", response_model=ActiveProjectResponse)
def set_active_project(project_id: str, service: ProjectService = Depends(get_project_service)) -> ActiveProjectResponse:
    return service.set_active_project(project_id)
