import { ArrowDown, Cable, Database, HardDrive, Network, ServerCog, TerminalSquare, type LucideIcon } from "lucide-react";
import { EmptyState } from "../../components/EmptyState";
import type { ActiveEnvironmentResponse } from "../../types/environments";

export function ActiveEnvironmentView({ active, isSwitching }: { active: ActiveEnvironmentResponse | null; isSwitching: boolean }) {
  const environment = active?.environment;

  if (!environment) {
    return (
      <section className="min-h-[520px] rounded-xl border border-slate-800/80 bg-graphite-900/75 p-4 shadow-glow backdrop-blur">
        <EmptyState title="No active target" description="Register or select a PostgreSQL environment to route the stable RelayDB endpoint." />
      </section>
    );
  }

  return (
    <section className="min-h-[520px] rounded-xl border border-slate-800/80 bg-graphite-900/75 p-5 shadow-glow backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Active Route</div>
          <h2 className="mt-2 text-2xl font-semibold text-white">{environment.name}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Your application keeps the same database URL. RelayDB changes the TCP target for new PostgreSQL connections.
          </p>
        </div>
        <div className={`rounded-full border px-3 py-1.5 text-xs ${isSwitching ? "border-signal-yellow/30 bg-signal-yellow/10 text-signal-yellow" : "border-signal-green/30 bg-signal-green/10 text-signal-green"}`}>
          {isSwitching ? "switching target" : "routing active"}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Info icon={Cable} label="Stable endpoint" value={active.stable_endpoint} />
        <Info icon={Database} label="Target database" value={environment.database} />
        <Info icon={Network} label="Target host" value={`${environment.host}:${environment.port}`} />
        <Info icon={ServerCog} label="Container status" value={environment.status} />
        <Info icon={TerminalSquare} label="Container" value={environment.container_name ?? "external"} />
        <Info icon={HardDrive} label="Docker volume" value={environment.volume_name ?? "external"} />
        <Info icon={Network} label="Docker network" value={environment.managed ? "relaydb-network" : "external"} />
        <Info icon={TerminalSquare} label="Username" value={environment.username} />
      </div>

      <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <ServerCog className="h-4 w-4 text-cyan-200" />
          Stable endpoint routing
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
          <FlowNode icon={TerminalSquare} title="Developer App" detail="DATABASE_URL=postgres://postgres:postgres@localhost:5432/app" />
          <Arrow />
          <FlowNode icon={Cable} title="RelayDB Endpoint" detail="localhost:5432" active={isSwitching} />
          <Arrow />
          <FlowNode icon={Database} title="Selected PostgreSQL" detail={`${environment.host}:${environment.port}/${environment.database}`} selected />
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="text-sm font-medium text-white">Connection contract</div>
        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/80 p-3 font-mono text-xs text-cyan-100">
          postgresql://postgres:postgres@localhost:5432/app
        </div>
      </div>
    </section>
  );
}

function Info({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Icon className="h-4 w-4 text-cyan-200" />
        {label}
      </div>
      <div className="mt-2 truncate text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function FlowNode({ icon: Icon, title, detail, active, selected }: { icon: LucideIcon; title: string; detail: string; active?: boolean; selected?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${selected ? "border-cyan-300/40 bg-cyan-300/10" : "border-slate-800 bg-slate-900/70"} ${active ? "animate-pulse" : ""}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-cyan-200" />
        <div className="text-sm font-semibold text-white">{title}</div>
      </div>
      <div className="mt-2 text-xs leading-5 text-slate-400">{detail}</div>
    </div>
  );
}

function Arrow() {
  return <ArrowDown className="mx-auto h-5 w-5 text-slate-500 md:rotate-[-90deg]" />;
}
