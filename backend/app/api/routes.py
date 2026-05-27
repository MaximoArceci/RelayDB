from fastapi import APIRouter

from app.api.v1 import connections, environments, projects, snapshots

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(connections.router)
api_router.include_router(environments.router)
api_router.include_router(projects.router)
api_router.include_router(snapshots.router)
