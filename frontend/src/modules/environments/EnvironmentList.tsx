import { CheckCircle2, Database, Server } from "lucide-react";
import type { PostgresEnvironment } from "../../types/environments";

export function EnvironmentList({
  environments,
  activeEnvironmentId,
  selectedEnvironmentId,
  isSwitching,
  onSwitch,
}: {
  environments: PostgresEnvironment[];
  activeEnvironmentId: string | null;
  selectedEnvironmentId: string | null;
  isSwitching: boolean;
  onSwitch: (environmentId: string) => void;
}) {
  return (
    <aside className="flex min-h-[520px] flex-col rounded-xl border border-slate-800/80 bg-graphite-900/75 p-4 shadow-glow backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Registered Targets</div>
          <h2 className="mt-1 text-lg font-semibold text-white">PostgreSQL instances</h2>
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
                </div>
                {isActive ? <CheckCircle2 className="h-5 w-5 text-signal-green" /> : null}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <Meta icon={Server} label="Host" value={environment.host} />
                <Meta icon={Database} label="Database" value={environment.database} />
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function Meta({ icon: Icon, label, value }: { icon: typeof Database; label: string; value: string }) {
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
