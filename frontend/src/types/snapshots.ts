export interface Snapshot {
  id: string;
  project_id: string;
  environment_id: string;
  environment_name: string;
  snapshot_name: string;
  file_path: string;
  created_at: string;
  size_bytes: number;
}

export interface SnapshotListResponse {
  snapshots: Snapshot[];
}
