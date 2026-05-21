import { Database, HardDrive, Info, Network, ServerCog, TerminalSquare, X, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "../../components/EmptyState";
import { Modal } from "../../components/Modal";
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
  onImportSnapshot,
  onDownloadSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
}: {
  active: ActiveEnvironmentResponse | null;
  isSwitching: boolean;
  snapshots: Snapshot[];
  isSnapshotting: boolean;
  onCreateSnapshot: (environmentId: string, name: string) => void;
  onImportSnapshot: (environmentId: string, name: string, file: File) => void;
  onDownloadSnapshot: (snapshotId: string, name: string) => void;
  onRestoreSnapshot: (snapshotId: string, environmentId: string) => void;
  onDeleteSnapshot: (snapshotId: string) => void;
}) {
  const environment = active?.environment;
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  if (!environment) {
    return (
      <section className="min-h-[520px] rounded-none border border-border/80 bg-surface/75 p-4 shadow-glow backdrop-blur">
        <EmptyState title="No active target" description="Register or select a PostgreSQL environment to route the stable RelayDB endpoint." />
      </section>
    );
  }

  return (
    <section className="min-h-[520px] rounded-none border border-border/80 bg-surface/75 p-5 shadow-glow backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.18em] text-subtle">Selected Environment</div>
          <h2 className="mt-2 text-2xl font-semibold text-text">{environment.name}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted/80">Run SQL and manage snapshots for the selected route target.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsInfoOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-none border border-border-strong text-muted transition hover:border-accent/40 hover:bg-accent/10 hover:text-accent/90"
            aria-label="Environment info"
            title="Environment info"
          >
            <Info className="h-4 w-4" />
          </button>
          <div className={`rounded-full border px-3 py-1.5 text-xs ${isSwitching ? "border-warning/30 bg-warning/10 text-warning" : "border-success/30 bg-success/10 text-success"}`}>
            {isSwitching ? "switching" : "selected"}
          </div>
        </div>
      </div>

      <SnapshotPanel
        environment={environment}
        snapshots={snapshots}
        isSnapshotting={isSnapshotting}
        onCreate={onCreateSnapshot}
        onImport={onImportSnapshot}
        onDownload={onDownloadSnapshot}
        onRestore={onRestoreSnapshot}
        onDelete={onDeleteSnapshot}
      />

      <SqlConsole environment={environment} />

      <Modal open={isInfoOpen} onClose={() => setIsInfoOpen(false)}>
        <div className="mx-auto w-full max-w-xl rounded-none border border-border bg-surface p-5 shadow-glow">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-accent">Environment Info</div>
                <h3 className="mt-2 text-xl font-semibold text-text">{environment.name}</h3>
              </div>
              <button type="button" onClick={() => setIsInfoOpen(false)} className="rounded-none border border-border-strong p-2 text-muted/80 transition hover:text-text" aria-label="Close environment info">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <Detail icon={Database} label="Target database" value={environment.database} />
              <Detail icon={Network} label="Target host" value={`${environment.host}:${environment.port}`} />
              <Detail icon={ServerCog} label="Container status" value={environment.status} />
              <Detail icon={TerminalSquare} label="Container" value={environment.container_name ?? "external"} />
              <Detail icon={HardDrive} label="Docker volume" value={environment.volume_name ?? "external"} />
              <Detail icon={Network} label="Docker network" value={environment.managed ? "relaydb-network" : "external"} />
              <Detail icon={TerminalSquare} label="Username" value={environment.username} />
            </div>
        </div>
      </Modal>
    </section>
  );
}

function Detail({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-none border border-border bg-app/60 px-3 py-2">
      <div className="flex items-center gap-2 text-sm text-muted/80">
        <Icon className="h-4 w-4 text-accent" />
        {label}
      </div>
      <div className="min-w-0 truncate font-mono text-sm text-text">{value}</div>
    </div>
  );
}
