from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import FileResponse

from app.schemas import Snapshot, SnapshotListResponse
from app.services.snapshot_service import SnapshotService

router = APIRouter(prefix="/snapshots", tags=["snapshots"])


def get_snapshot_service() -> SnapshotService:
    return SnapshotService()


@router.get("", response_model=SnapshotListResponse)
def list_snapshots(service: SnapshotService = Depends(get_snapshot_service)) -> SnapshotListResponse:
    return service.list_snapshots()


@router.post("/upload", response_model=Snapshot)
async def upload_snapshot(
    environment_id: str = Form(...),
    name: str = Form(...),
    file: UploadFile = File(...),
    service: SnapshotService = Depends(get_snapshot_service),
) -> Snapshot:
    content = await file.read()
    return service.import_snapshot(environment_id, name, file.filename or "snapshot.dump", content)


@router.get("/{snapshot_id}/download")
def download_snapshot(
    snapshot_id: str,
    service: SnapshotService = Depends(get_snapshot_service),
) -> FileResponse:
    snapshot = service.get_snapshot(snapshot_id)
    file_path = service.get_snapshot_file_path(snapshot_id)
    download_name = f"{snapshot.snapshot_name}.dump"
    return FileResponse(file_path, media_type="application/octet-stream", filename=download_name)


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
