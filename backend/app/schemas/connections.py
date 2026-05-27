from datetime import UTC, datetime

from pydantic import BaseModel, Field


class ConnectionSlotCreate(BaseModel):
    name: str = Field(min_length=1)
    owner: str = Field(min_length=1)
    stable_port: int = Field(ge=1, le=65535)
    target_environment_id: str = Field(min_length=1)
    project_id: str = "default"


class ConnectionSlotUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    owner: str | None = Field(default=None, min_length=1)
    stable_port: int | None = Field(default=None, ge=1, le=65535)
    target_environment_id: str | None = Field(default=None, min_length=1)
    project_id: str | None = Field(default=None, min_length=1)


class ConnectionSlot(ConnectionSlotCreate):
    id: str
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    status: str = "active"


class ConnectionSlotListResponse(BaseModel):
    connections: list[ConnectionSlot]
