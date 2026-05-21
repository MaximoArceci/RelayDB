import { Camera, CheckCircle2, Database, Play, Plus, Square, Trash2, X, type LucideIcon } from "lucide-react";
import type { MouseEventHandler } from "react";
import { useState } from "react";
import type { PostgresEnvironment } from "../../types/environments";
import type { Snapshot } from "../../types/snapshots";

export function EnvironmentList({
  environments,
  activeEnvironmentId,
  selectedEnvironmentId,
  isSwitching,
  actingEnvironmentId,
  snapshots,
  onSwitch,
  onCreate,
  onStart,
  onStop,
  onDelete,
}: {
  environments: PostgresEnvironment[];
  activeEnvironmentId: string | null;
  selectedEnvironmentId: string | null;
  isSwitching: boolean;
  actingEnvironmentId: string | null;
  snapshots: Snapshot[];
  onSwitch: (environmentId: string) => void;
  onCreate: () => void;
  onStart: (environmentId: string) => void;
  onStop: (environmentId: string) => void;
  onDelete: (environmentId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleEnvironments = normalizedQuery
    ? environments.filter((environment) => `${environment.name} ${environment.status}`.toLowerCase().includes(normalizedQuery))
    : environments;

  return (
    <aside className="flex min-h-[420px] flex-col overflow-hidden rounded-none border border-border/80 bg-surface/75 p-4 shadow-glow backdrop-blur xl:sticky xl:top-3 xl:h-[calc(100vh-9.5rem)]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-subtle">Provisioned Targets</div>
          <h2 className="mt-1 text-lg font-semibold text-text">PostgreSQL environments</h2>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-8 items-center gap-1.5 rounded-none border border-accent bg-accent px-2.5 text-xs font-medium text-app transition hover:bg-accent/90"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </button>
      </div>

      <div className="relative mt-4">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search environments"
          className="h-10 w-full rounded-none border border-border bg-app px-3 pr-10 text-sm text-text outline-none ring-accent/30 transition placeholder:text-subtle/70 focus:border-accent/50 focus:ring-4"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-none text-subtle transition hover:bg-border hover:text-text"
            aria-label="Clear environment search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="nexus-scrollbar mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {visibleEnvironments.map((environment) => {
          const isActive = activeEnvironmentId === environment.id;
          const isSelected = selectedEnvironmentId === environment.id;
          const environmentSnapshots = snapshots.filter((snapshot) => snapshot.environment_id === environment.id);
          const latestSnapshot = environmentSnapshots[environmentSnapshots.length - 1];

          return (
            <button
              key={environment.id}
              onClick={() => onSwitch(environment.id)}
              className={`w-full rounded-none border p-4 text-left transition ${
                isActive ? "border-accent bg-accent/20 shadow-glow" : "border-border bg-app/60 hover:border-accent/60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-text">
                    <span className={`h-2.5 w-2.5 rounded-full ${isActive ? "bg-success" : isSelected && isSwitching ? "animate-pulse bg-warning" : "bg-subtle"}`} />
                    {environment.name}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-subtle">
                    <span className={`rounded-full border px-2 py-0.5 ${statusClass(environment.status)}`}>{environment.status}</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-accent/90">
                      <Camera className="h-3 w-3" />
                      {environmentSnapshots.length} snapshot{environmentSnapshots.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {latestSnapshot ? <div className="mt-2 text-xs text-subtle">Latest frozen state: {new Date(latestSnapshot.created_at).toLocaleString()}</div> : null}
                </div>
                {isActive ? <CheckCircle2 className="h-5 w-5 text-success" /> : null}
              </div>

              {environment.managed ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionButton
                    icon={Play}
                    label="Start"
                    disabled={actingEnvironmentId === environment.id || environment.status === "running"}
                    onClick={(event) => {
                      event.stopPropagation();
                      onStart(environment.id);
                    }}
                  />
                  <ActionButton
                    icon={Square}
                    label="Stop"
                    disabled={actingEnvironmentId === environment.id || environment.status !== "running"}
                    onClick={(event) => {
                      event.stopPropagation();
                      onStop(environment.id);
                    }}
                  />
                  <ActionButton
                    icon={Trash2}
                    label="Delete"
                    danger
                    disabled={actingEnvironmentId === environment.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (window.confirm(`Delete ${environment.name} and its Docker volume?`)) {
                        onDelete(environment.id);
                      }
                    }}
                  />
                </div>
              ) : null}
            </button>
          );
        })}
        {visibleEnvironments.length === 0 ? <div className="rounded-none border border-border bg-app/60 p-3 text-sm text-muted/80">No environments found.</div> : null}
      </div>
    </aside>
  );
}

function statusClass(status: string) {
  if (status === "running") {
    return "border-success/30 bg-success/10 text-success";
  }
  if (status === "exited" || status === "created") {
    return "border-warning/30 bg-warning/10 text-warning";
  }
  if (status === "missing") {
    return "border-danger/30 bg-danger/10 text-danger";
  }
  return "border-border-strong bg-surface-muted text-muted/80";
}

function ActionButton({
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
  onClick: MouseEventHandler<HTMLSpanElement>;
}) {
  return (
    <span
      role="button"
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={`inline-flex h-8 items-center gap-1.5 rounded-none border px-2.5 text-xs transition ${
        danger ? "border-danger/30 text-danger hover:bg-danger/10" : "border-border-strong text-muted hover:border-accent/40 hover:bg-accent/10"
      } ${disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
