import { CheckCircle2, Database, HardDrive, Play, Server, Square, Trash2, type LucideIcon } from "lucide-react";
import type { MouseEventHandler } from "react";
import type { PostgresEnvironment } from "../../types/environments";

export function EnvironmentList({
  environments,
  activeEnvironmentId,
  selectedEnvironmentId,
  isSwitching,
  actingEnvironmentId,
  onSwitch,
  onStart,
  onStop,
  onDelete,
}: {
  environments: PostgresEnvironment[];
  activeEnvironmentId: string | null;
  selectedEnvironmentId: string | null;
  isSwitching: boolean;
  actingEnvironmentId: string | null;
  onSwitch: (environmentId: string) => void;
  onStart: (environmentId: string) => void;
  onStop: (environmentId: string) => void;
  onDelete: (environmentId: string) => void;
}) {
  return (
    <aside className="flex min-h-[520px] flex-col rounded-xl border border-slate-800/80 bg-graphite-900/75 p-4 shadow-glow backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Provisioned Targets</div>
          <h2 className="mt-1 text-lg font-semibold text-white">PostgreSQL environments</h2>
        </div>
        <Database className="h-5 w-5 text-cyan-200" />
      </div>

      <div className="nexus-scrollbar mt-4 flex-1 space-y-3 overflow-auto">
        {environments.map((environment) => {
          const isActive = activeEnvironmentId === environment.id;
          const isSelected = selectedEnvironmentId === environment.id;

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
                  <div className="mt-2 font-mono text-xs text-slate-400">
                    {environment.host}:{environment.port}/{environment.database}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className={`rounded-full border px-2 py-0.5 ${statusClass(environment.status)}`}>{environment.status}</span>
                    <span>{environment.managed ? "managed container" : "external target"}</span>
                  </div>
                </div>
                {isActive ? <CheckCircle2 className="h-5 w-5 text-signal-green" /> : null}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <Meta icon={Server} label="Host" value={environment.host} />
                <Meta icon={Database} label="Database" value={environment.database} />
                <Meta icon={Server} label="Container" value={environment.container_name ?? "external"} />
                <Meta icon={HardDrive} label="Volume" value={environment.volume_name ?? "external"} />
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

function Meta({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 truncate font-medium text-slate-200">{value}</div>
    </div>
  );
}
