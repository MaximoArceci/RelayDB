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
    ? environments.filter((environment) =>
        `${environment.name} ${environment.status} ${environment.managed ? "managed container" : "external target"}`.toLowerCase().includes(normalizedQuery),
      )
    : environments;

  return (
    <aside className="flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-slate-800/80 bg-graphite-900/75 p-4 shadow-glow backdrop-blur xl:sticky xl:top-3 xl:h-[calc(100vh-9.5rem)]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Provisioned Targets</div>
          <h2 className="mt-1 text-lg font-semibold text-white">PostgreSQL environments</h2>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-2.5 text-xs font-medium text-cyan-100 transition hover:border-cyan-300/60 hover:bg-cyan-300/15"
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
          className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 pr-10 text-sm text-white outline-none ring-cyan-300/30 transition placeholder:text-slate-600 focus:border-cyan-300/50 focus:ring-4"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-800 hover:text-white"
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
              className={`w-full rounded-xl border p-4 text-left transition ${
                isActive ? "border-cyan-300/50 bg-cyan-300/10 shadow-glow" : "border-slate-800 bg-slate-950/60 hover:border-cyan-300/30"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <span className={`h-2.5 w-2.5 rounded-full ${isActive ? "bg-signal-green" : isSelected && isSwitching ? "animate-pulse bg-signal-yellow" : "bg-slate-500"}`} />
                    {environment.name}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className={`rounded-full border px-2 py-0.5 ${statusClass(environment.status)}`}>{environment.status}</span>
                    <span>{environment.managed ? "managed container" : "external target"}</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 text-cyan-100">
                      <Camera className="h-3 w-3" />
                      {environmentSnapshots.length} snapshot{environmentSnapshots.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {latestSnapshot ? <div className="mt-2 text-xs text-slate-500">Latest frozen state: {new Date(latestSnapshot.created_at).toLocaleString()}</div> : null}
                </div>
                {isActive ? <CheckCircle2 className="h-5 w-5 text-signal-green" /> : null}
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
        {visibleEnvironments.length === 0 ? <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-400">No environments found.</div> : null}
      </div>
    </aside>
  );
}

function statusClass(status: string) {
  if (status === "running") {
    return "border-signal-green/30 bg-signal-green/10 text-signal-green";
  }
  if (status === "exited" || status === "created") {
    return "border-signal-yellow/30 bg-signal-yellow/10 text-signal-yellow";
  }
  if (status === "missing") {
    return "border-signal-red/30 bg-signal-red/10 text-signal-red";
  }
  return "border-slate-700 bg-slate-900 text-slate-400";
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
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition ${
        danger ? "border-signal-red/30 text-signal-red hover:bg-signal-red/10" : "border-slate-700 text-slate-300 hover:border-cyan-300/40 hover:bg-cyan-300/10"
      } ${disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
