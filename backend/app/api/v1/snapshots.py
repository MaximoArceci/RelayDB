from fastapi import APIRouter, Depends

from app.schemas import Snapshot, SnapshotListResponse
from app.services.snapshot_service import SnapshotService

router = APIRouter(prefix="/snapshots", tags=["snapshots"])


def get_snapshot_service() -> SnapshotService:
    return SnapshotService()


@router.get("", response_model=SnapshotListResponse)
def list_snapshots(service: SnapshotService = Depends(get_snapshot_service)) -> SnapshotListResponse:
    return service.list_snapshots()


@router.post("/{snapshot_id}/restore/{environment_id}", response_model=Snapshot)
def restore_snapshot(
    snapshot_id: str,
    environment_id: str,
    service: SnapshotService = Depends(get_snapshot_service),
) -> Snapshot:
    return service.restore_snapshot(snapshot_id, environment_id)


@router.delete("/{snapshot_id}", response_model=Snapshot)
def delete_snapshot(snapshot_id: str, service: SnapshotService = Depends(get_snapshot_service)) -> Snapshot:
    return service.delete_snapshot(snapshot_id)
