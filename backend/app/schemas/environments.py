from pydantic import BaseModel, Field


class EnvironmentCreate(BaseModel):
    name: str = Field(min_length=1)
    host: str = Field(min_length=1)
    port: int = Field(default=5432, ge=1, le=65535)
    database: str = Field(min_length=1)
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class Environment(EnvironmentCreate):
    id: str


class EnvironmentListResponse(BaseModel):
    environments: list[Environment]
    active_environment_id: str | None


class ActiveEnvironmentResponse(BaseModel):
    environment: Environment | None
    stable_endpoint: str


class SwitchActiveResponse(BaseModel):
    active: Environment
    stable_endpoint: str
