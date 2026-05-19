import { Camera, Download, Ellipsis, FileUp, RotateCcw, Trash2, X, type LucideIcon } from "lucide-react";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { PostgresEnvironment } from "../../types/environments";
import type { Snapshot } from "../../types/snapshots";

type SortKey = "name" | "date" | "origin";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 12;

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
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [openMenuSnapshotId, setOpenMenuSnapshotId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [uploadName, setUploadName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const orderedSnapshots = useMemo(() => {
    return [...snapshots].sort((left, right) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortKey === "date") {
        return (Date.parse(left.created_at) - Date.parse(right.created_at)) * direction;
      }
      const leftValue = sortKey === "name" ? left.snapshot_name : left.environment_name;
      const rightValue = sortKey === "name" ? right.snapshot_name : right.environment_name;
      return leftValue.localeCompare(rightValue) * direction;
    });
  }, [snapshots, sortDirection, sortKey]);
  const totalPages = Math.max(1, Math.ceil(orderedSnapshots.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedSnapshots = orderedSnapshots.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const environmentSnapshots = orderedSnapshots.filter((snapshot) => snapshot.environment_id === environment.id);
  const latestSnapshot = environmentSnapshots[environmentSnapshots.length - 1];

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

  function changeSort(nextSortKey: SortKey) {
    if (sortKey === nextSortKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(nextSortKey);
      setSortDirection(nextSortKey === "date" ? "desc" : "asc");
    }
    setPage(1);
    setOpenMenuSnapshotId(null);
  }

  return (
    <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Camera className="h-4 w-4 text-cyan-200" />
            Snapshot actions
          </div>
          <div className="mt-1 text-xs text-slate-500">Create or import reusable database states from this environment.</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400">
          {environmentSnapshots.length} snapshot{environmentSnapshots.length === 1 ? "" : "s"}
          {latestSnapshot ? <span className="ml-2 text-slate-500">Latest {new Date(latestSnapshot.created_at).toLocaleDateString()}</span> : null}
        </div>
      </div>
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

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setIsImportOpen(true)}
          disabled={environment.status !== "running"}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-signal-green/30 bg-signal-green/10 px-3 text-sm font-medium text-signal-green transition hover:border-signal-green/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileUp className="h-4 w-4 shrink-0 text-cyan-200" />
          Import snapshot
        </button>
      </div>

      {isImportOpen
        ? createPortal(
            <div className="fixed left-0 top-0 z-50 flex h-screen w-screen items-center justify-center bg-slate-950/80 p-4 backdrop-blur">
          <div className="flex h-[92vh] w-full max-w-6xl flex-col rounded-xl border border-slate-800 bg-graphite-900 p-5 shadow-glow">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-cyan-200">Import Snapshot</div>
                <h3 className="mt-2 text-xl font-semibold text-white">Restore into {environment.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                className="rounded-lg border border-slate-700 p-2 text-slate-400 transition hover:text-white"
                aria-label="Close import snapshot"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submitUpload} className="mt-5 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <FileUp className="h-4 w-4 text-cyan-200" />
                Import from device
              </div>
              <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
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
                  Upload
                </button>
              </div>
            </form>

            <div className="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-800">
              <div className="grid grid-cols-[minmax(0,1.4fr)_180px_minmax(0,1fr)_96px] gap-3 border-b border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-500 max-md:hidden">
                <SortHeader label="Name" active={sortKey === "name"} direction={sortDirection} onClick={() => changeSort("name")} />
                <SortHeader label="Date" active={sortKey === "date"} direction={sortDirection} onClick={() => changeSort("date")} />
                <SortHeader label="Origin" active={sortKey === "origin"} direction={sortDirection} onClick={() => changeSort("origin")} />
                <div className="text-right">Actions</div>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                {pagedSnapshots.length ? (
                  pagedSnapshots.map((snapshot) => (
                    <div key={snapshot.id} className="grid gap-3 border-b border-slate-800 bg-slate-950/35 px-3 py-3 last:border-b-0 md:grid-cols-[minmax(0,1.4fr)_180px_minmax(0,1fr)_96px] md:items-center">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white">{snapshot.snapshot_name}</div>
                        <div className="mt-1 text-xs text-slate-500 md:hidden">
                          {new Date(snapshot.created_at).toLocaleString()} · {snapshot.environment_name}
                        </div>
                      </div>
                      <div className="hidden text-xs text-slate-500 md:block">{new Date(snapshot.created_at).toLocaleDateString()}</div>
                      <div className="hidden truncate text-sm text-slate-400 md:block">{snapshot.environment_name}</div>
                      <div className="relative flex justify-end">
                        <button
                          type="button"
                          onClick={() => setOpenMenuSnapshotId(openMenuSnapshotId === snapshot.id ? null : snapshot.id)}
                          disabled={isSnapshotting}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Open actions for ${snapshot.snapshot_name}`}
                        >
                          <Ellipsis className="h-4 w-4" />
                        </button>
                        {openMenuSnapshotId === snapshot.id ? (
                          <div className="absolute right-0 top-9 z-10 w-40 overflow-hidden rounded-lg border border-slate-700 bg-graphite-900 shadow-glow">
                            <MenuItem
                              icon={RotateCcw}
                              label="Restore"
                              disabled={isSnapshotting || environment.status !== "running"}
                              onClick={() => {
                                if (window.confirm(`Restore ${snapshot.snapshot_name} into ${environment.name}? Current database state will be replaced.`)) {
                                  onRestore(snapshot.id, environment.id);
                                  setOpenMenuSnapshotId(null);
                                  setIsImportOpen(false);
                                }
                              }}
                            />
                            <MenuItem
                              icon={Download}
                              label="Download"
                              disabled={isSnapshotting}
                              onClick={() => {
                                onDownload(snapshot.id, snapshot.snapshot_name);
                                setOpenMenuSnapshotId(null);
                              }}
                            />
                            <MenuItem
                              icon={Trash2}
                              label="Delete"
                              danger
                              disabled={isSnapshotting}
                              onClick={() => {
                                if (window.confirm(`Delete snapshot ${snapshot.snapshot_name}?`)) {
                                  onDelete(snapshot.id);
                                  setOpenMenuSnapshotId(null);
                                }
                              }}
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-8 text-center text-sm text-slate-400">No snapshots available.</div>
                )}
              </div>
              <div className="flex flex-col gap-2 border-t border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  Showing {orderedSnapshots.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-{Math.min(currentPage * PAGE_SIZE, orderedSnapshots.length)} of {orderedSnapshots.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => {
                      setPage(currentPage - 1);
                      setOpenMenuSnapshotId(null);
                    }}
                    className="h-8 rounded-lg border border-slate-700 px-3 text-slate-300 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      setPage(currentPage + 1);
                      setOpenMenuSnapshotId(null);
                    }}
                    className="h-8 rounded-lg border border-slate-700 px-3 text-slate-300 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function SortHeader({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex min-w-0 items-center gap-1 text-left transition hover:text-cyan-100">
      <span className="truncate">{label}</span>
      {active ? <span className="text-cyan-200">{direction === "asc" ? "↑" : "↓"}</span> : null}
    </button>
  );
}

function MenuItem({
  icon: Icon,
  label,
  danger,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-9 w-full items-center gap-2 px-3 text-left text-xs transition ${
        danger ? "text-signal-red hover:bg-signal-red/10" : "text-slate-300 hover:bg-cyan-300/10 hover:text-cyan-100"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
