import { Camera, Download, Ellipsis, FileUp, RotateCcw, Trash2, X, type LucideIcon } from "lucide-react";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import type { PostgresEnvironment } from "../../types/environments";
import { Modal } from "../../components/Modal";
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
    <div className="mt-5 rounded-none border border-border bg-app/60 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-text">
            <Camera className="h-4 w-4 text-accent" />
            Snapshot actions
          </div>
          <div className="mt-1 text-xs text-subtle">Create or import reusable database states from this environment.</div>
        </div>
        <div className="rounded-none border border-border bg-surface-muted/60 px-3 py-2 text-xs text-muted/80">
          {environmentSnapshots.length} snapshot{environmentSnapshots.length === 1 ? "" : "s"}
          {latestSnapshot ? <span className="ml-2 text-subtle">Latest {new Date(latestSnapshot.created_at).toLocaleDateString()}</span> : null}
        </div>
      </div>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="before-auth-refactor"
          className="h-10 flex-1 rounded-none border border-border bg-app px-3 text-sm text-text outline-none ring-accent/30 transition placeholder:text-subtle/70 focus:border-accent/50 focus:ring-4"
        />
        <button
          type="submit"
          disabled={isSnapshotting || !name.trim() || environment.status !== "running"}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-none border border-accent bg-accent px-3 text-sm font-medium text-app transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
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
          className="inline-flex h-10 items-center justify-center gap-2 rounded-none border border-success/30 bg-success/10 px-3 text-sm font-medium text-success transition hover:border-success/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileUp className="h-4 w-4 shrink-0 text-accent" />
          Import snapshot
        </button>
      </div>

      <Modal open={isImportOpen} onClose={() => setIsImportOpen(false)}>
        <div className="mx-auto flex h-[92vh] w-full max-w-6xl flex-col rounded-none border border-border bg-surface p-5 shadow-glow">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-accent">Import Snapshot</div>
                <h3 className="mt-2 text-xl font-semibold text-text">Restore into {environment.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                className="rounded-none border border-border-strong p-2 text-muted/80 transition hover:text-text"
                aria-label="Close import snapshot"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submitUpload} className="mt-5 rounded-none border border-border bg-app/60 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-text">
                <FileUp className="h-4 w-4 text-accent" />
                Import from device
              </div>
              <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <input
                  value={uploadName}
                  onChange={(event) => setUploadName(event.target.value)}
                  placeholder="imported-teammate-state"
                  className="h-10 rounded-none border border-border bg-app px-3 text-sm text-text outline-none ring-accent/30 transition placeholder:text-subtle/70 focus:border-accent/50 focus:ring-4"
                />
                <label className="flex h-10 min-w-0 cursor-pointer items-center gap-2 rounded-none border border-border bg-app px-3 text-sm text-muted transition hover:border-accent/40">
                  <FileUp className="h-4 w-4 shrink-0 text-accent" />
                  <span className="truncate">{uploadFile?.name ?? "Choose dump file"}</span>
                  <input type="file" accept=".dump,.sql,.backup,application/octet-stream" onChange={selectUploadFile} className="sr-only" />
                </label>
                <button
                  type="submit"
                  disabled={isSnapshotting || !uploadName.trim() || !uploadFile}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-none border border-success/30 bg-success/10 px-3 text-sm font-medium text-success transition hover:border-success/60 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileUp className="h-4 w-4" />
                  Upload
                </button>
              </div>
            </form>

            <div className="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border border-border">
              <div className="grid grid-cols-[minmax(0,1.4fr)_180px_minmax(0,1fr)_96px] gap-3 border-b border-border bg-app/70 px-3 py-2 text-xs text-subtle max-md:hidden">
                <SortHeader label="Name" active={sortKey === "name"} direction={sortDirection} onClick={() => changeSort("name")} />
                <SortHeader label="Date" active={sortKey === "date"} direction={sortDirection} onClick={() => changeSort("date")} />
                <SortHeader label="Origin" active={sortKey === "origin"} direction={sortDirection} onClick={() => changeSort("origin")} />
                <div className="text-right">Actions</div>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                {pagedSnapshots.length ? (
                  pagedSnapshots.map((snapshot) => (
                    <div key={snapshot.id} className="grid gap-3 border-b border-border bg-app/35 px-3 py-3 last:border-b-0 md:grid-cols-[minmax(0,1.4fr)_180px_minmax(0,1fr)_96px] md:items-center">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-text">{snapshot.snapshot_name}</div>
                        <div className="mt-1 text-xs text-subtle md:hidden">
                          {new Date(snapshot.created_at).toLocaleString()} · {snapshot.environment_name}
                        </div>
                      </div>
                      <div className="hidden text-xs text-subtle md:block">{new Date(snapshot.created_at).toLocaleDateString()}</div>
                      <div className="hidden truncate text-sm text-muted/80 md:block">{snapshot.environment_name}</div>
                      <div className="relative flex justify-end">
                        <button
                          type="button"
                          onClick={() => setOpenMenuSnapshotId(openMenuSnapshotId === snapshot.id ? null : snapshot.id)}
                          disabled={isSnapshotting}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-none border border-border-strong text-muted transition hover:border-accent/40 hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Open actions for ${snapshot.snapshot_name}`}
                        >
                          <Ellipsis className="h-4 w-4" />
                        </button>
                        {openMenuSnapshotId === snapshot.id ? (
                          <div className="absolute right-0 top-9 z-10 w-40 overflow-hidden rounded-none border border-border-strong bg-surface shadow-glow">
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
                  <div className="px-3 py-8 text-center text-sm text-muted/80">No snapshots available.</div>
                )}
              </div>
              <div className="flex flex-col gap-2 border-t border-border bg-app/70 px-3 py-2 text-xs text-muted/80 sm:flex-row sm:items-center sm:justify-between">
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
                  className="h-8 rounded-none border border-accent bg-accent px-3 font-medium text-app transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="h-8 rounded-none border border-border-strong px-3 text-muted transition hover:border-accent/40 hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
        </div>
      </Modal>
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
    <button type="button" onClick={onClick} className="flex min-w-0 items-center gap-1 text-left transition hover:text-accent/90">
      <span className="truncate">{label}</span>
      {active ? <span className="text-accent">{direction === "asc" ? "↑" : "↓"}</span> : null}
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
        danger ? "text-danger hover:bg-danger/10" : "text-muted hover:bg-accent/10 hover:text-accent/90"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
