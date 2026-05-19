import { ArrowDown, Cable, Database, HardDrive, Network, ServerCog, TerminalSquare, type LucideIcon } from "lucide-react";
import { EmptyState } from "../../components/EmptyState";
import type { ActiveEnvironmentResponse } from "../../types/environments";
import type { Snapshot } from "../../types/snapshots";
import { SnapshotPanel } from "./SnapshotPanel";
import { SqlConsole } from "./SqlConsole";

export function ActiveEnvironmentView({
  active,
  isSwitching,
  snapshots,
  isSnapshotting,
  onCreateSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
}: {
  active: ActiveEnvironmentResponse | null;
  isSwitching: boolean;
  snapshots: Snapshot[];
  isSnapshotting: boolean;
  onCreateSnapshot: (environmentId: string, name: string) => void;
  onRestoreSnapshot: (snapshotId: string, environmentId: string) => void;
  onDeleteSnapshot: (snapshotId: string) => void;
}) {
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
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Selected Environment</div>
          <h2 className="mt-2 text-2xl font-semibold text-white">{environment.name}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Inspect this PostgreSQL target, run SQL, and manage snapshots. Stable connection strings are managed in the routes panel above.
          </p>
        </div>
        <div className={`rounded-full border px-3 py-1.5 text-xs ${isSwitching ? "border-signal-yellow/30 bg-signal-yellow/10 text-signal-yellow" : "border-signal-green/30 bg-signal-green/10 text-signal-green"}`}>
          {isSwitching ? "switching selection" : "selected"}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
          Environment access model
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
          <FlowNode icon={TerminalSquare} title="Developer App" detail="Use the stable route assigned to your workflow" />
          <Arrow />
          <FlowNode icon={Cable} title="Stable Route" detail="localhost:15432, localhost:25432, or another assigned port" active={isSwitching} />
          <Arrow />
          <FlowNode icon={Database} title="Selected PostgreSQL" detail={`${environment.host}:${environment.port}/${environment.database}`} selected />
        </div>
      </div>

      <SnapshotPanel
        environment={environment}
        snapshots={snapshots}
        isSnapshotting={isSnapshotting}
        onCreate={onCreateSnapshot}
        onRestore={onRestoreSnapshot}
        onDelete={onDeleteSnapshot}
      />

      <SqlConsole environment={environment} />
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
