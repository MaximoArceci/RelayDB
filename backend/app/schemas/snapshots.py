from pydantic import BaseModel, Field


class SnapshotCreate(BaseModel):
    name: str = Field(min_length=1)


class Snapshot(BaseModel):
    id: str
    environment_id: str
    environment_name: str
    snapshot_name: str
    file_path: str
    created_at: str
    size_bytes: int


class SnapshotListResponse(BaseModel):
    snapshots: list[Snapshot]
