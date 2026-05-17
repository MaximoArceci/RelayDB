from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import api_router
from app.core.settings import settings
from app.services.environment_registry import EnvironmentRegistry

app = FastAPI(
    title="Switchbase API",
    description="Minimal control API for stable PostgreSQL endpoint routing.",
    version="0.4.0",
    openapi_url="/openapi.json",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.on_event("startup")
def seed_example_environments() -> None:
    EnvironmentRegistry().seed_examples_if_empty()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "environment": settings.api_env}
