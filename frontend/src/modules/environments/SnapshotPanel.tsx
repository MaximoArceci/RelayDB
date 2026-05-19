import { Camera, Download, FileUp, RotateCcw, Trash2 } from "lucide-react";
import { ChangeEvent, FormEvent, useState } from "react";
import type { PostgresEnvironment } from "../../types/environments";
import type { Snapshot } from "../../types/snapshots";

export function SnapshotPanel({
  environment,
  snapshots,
  isSnapshotting,
  onCreate,
  onImport,
  onDownload,
  onRestore,
  onDelete,
}: {
  environment: PostgresEnvironment;
  snapshots: Snapshot[];
  isSnapshotting: boolean;
  onCreate: (environmentId: string, name: string) => void;
  onImport: (environmentId: string, name: string, file: File) => void;
  onDownload: (snapshotId: string, name: string) => void;
  onRestore: (snapshotId: string, environmentId: string) => void;
  onDelete: (snapshotId: string) => void;
}) {
  const [name, setName] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const snapshotName = name.trim();
    if (!snapshotName) {
      return;
    }
    onCreate(environment.id, snapshotName);
    setName("");
  }

  function selectUploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setUploadFile(file);
    if (file && !uploadName.trim()) {
      setUploadName(file.name.replace(/\.[^.]+$/, ""));
    }
  }

  function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const snapshotName = uploadName.trim();
    if (!snapshotName || !uploadFile) {
      return;
    }
    onImport(environment.id, snapshotName, uploadFile);
    setUploadName("");
    setUploadFile(null);
    event.currentTarget.reset();
  }

  return (
    <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-white">
        <Camera className="h-4 w-4 text-cyan-200" />
        Reproducible states
      </div>
      <div className="mt-1 text-xs text-slate-500">Freeze this environment, or restore any frozen state into it.</div>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="before-auth-refactor"
          className="h-10 flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-white outline-none ring-cyan-300/30 transition placeholder:text-slate-600 focus:border-cyan-300/50 focus:ring-4"
        />
        <button
          type="submit"
          disabled={isSnapshotting || !name.trim() || environment.status !== "running"}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 text-sm font-medium text-cyan-100 transition hover:border-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Camera className="h-4 w-4" />
          Freeze
        </button>
      </form>

      <form onSubmit={submitUpload} className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <input
          value={uploadName}
          onChange={(event) => setUploadName(event.target.value)}
          placeholder="imported-teammate-state"
          className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-white outline-none ring-cyan-300/30 transition placeholder:text-slate-600 focus:border-cyan-300/50 focus:ring-4"
        />
        <label className="flex h-10 min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-300 transition hover:border-cyan-300/40">
          <FileUp className="h-4 w-4 shrink-0 text-cyan-200" />
          <span className="truncate">{uploadFile?.name ?? "Choose dump file"}</span>
          <input type="file" accept=".dump,.sql,.backup,application/octet-stream" onChange={selectUploadFile} className="sr-only" />
        </label>
        <button
          type="submit"
          disabled={isSnapshotting || !uploadName.trim() || !uploadFile}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-signal-green/30 bg-signal-green/10 px-3 text-sm font-medium text-signal-green transition hover:border-signal-green/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileUp className="h-4 w-4" />
          Import
        </button>
      </form>

      <div className="mt-4 space-y-2">
        {snapshots.length ? (
          snapshots.map((snapshot) => (
            <div key={snapshot.id} className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-medium text-white">{snapshot.snapshot_name}</div>
                <div className="mt-1 text-xs text-slate-500">
                  From {snapshot.environment_name} · {new Date(snapshot.created_at).toLocaleString()} · {formatBytes(snapshot.size_bytes)}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onDownload(snapshot.id, snapshot.snapshot_name)}
                  disabled={isSnapshotting}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 text-xs text-slate-300 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Restore ${snapshot.snapshot_name} into ${environment.name}? Current database state will be replaced.`)) {
                      onRestore(snapshot.id, environment.id);
                    }
                  }}
                  disabled={isSnapshotting || environment.status !== "running"}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 text-xs text-slate-300 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete snapshot ${snapshot.snapshot_name}?`)) {
                      onDelete(snapshot.id);
                    }
                  }}
                  disabled={isSnapshotting}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-signal-red/30 px-2.5 text-xs text-signal-red transition hover:bg-signal-red/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-400">No frozen states have been created yet.</div>
        )}
      </div>
    </div>
  );
}

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
