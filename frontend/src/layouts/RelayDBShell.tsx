import { Cable, Database, Search, ServerCog } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { useEnvironmentPlatform } from "../hooks/useEnvironmentPlatform";
import { ActiveEnvironmentView } from "../modules/environments/ActiveEnvironmentView";
import { EnvironmentList } from "../modules/environments/EnvironmentList";

export function RelayDBShell() {
  const { environments, active, selectedEnvironmentId, isLoading, isSwitching, error, mountEnvironment } = useEnvironmentPlatform();

  return (
    <div className="flex min-h-screen flex-col text-slate-100">
      <header className="flex h-16 items-center gap-4 border-b border-slate-800/80 bg-graphite-950/90 px-5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-300/10 shadow-glow">
            <Database className="h-5 w-5 text-cyan-200" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide">RelayDB</div>
            <div className="text-xs text-slate-500">Stable PostgreSQL routing</div>
          </div>
        </div>

        <div className="relative hidden flex-1 md:block">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input className="h-9 w-full rounded-lg border border-slate-800 bg-slate-950/70 pl-9 pr-3 text-sm outline-none ring-cyan-300/30 transition focus:border-cyan-300/50 focus:ring-4" placeholder="Search registered PostgreSQL targets..." />
        </div>

        <select
          className="h-9 max-w-56 rounded-lg border border-slate-800 bg-slate-950/80 px-3 text-sm text-slate-300 outline-none"
          value={selectedEnvironmentId ?? ""}
          onChange={(event) => mountEnvironment(event.target.value)}
        >
          {environments.map((environment) => (
            <option key={environment.id} value={environment.id}>
              {environment.name}
            </option>
          ))}
        </select>

        <div className="hidden items-center gap-2 rounded-full border border-signal-green/30 bg-signal-green/10 px-3 py-1.5 text-xs text-signal-green lg:flex">
          <Cable className="h-3.5 w-3.5" />
          localhost:5432
        </div>
      </header>

      <main className="grid flex-1 grid-cols-1 gap-4 p-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <section className="xl:col-span-2">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-800/80 bg-graphite-900/70 p-4 shadow-glow backdrop-blur lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-200">
                <ServerCog className="h-4 w-4" />
                TCP Routing MVP
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">One local database URL. One active PostgreSQL target.</h1>
              <p className="mt-2 text-sm text-slate-400">
                Your app connects to <span className="font-mono text-cyan-100">localhost:5432</span>. RelayDB forwards new TCP connections to the selected external PostgreSQL instance.
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3">
              <div className="text-xs text-slate-500">Currently routed to</div>
              <div className="mt-1 text-sm font-semibold text-white">{active?.environment?.name ?? "No active target"}</div>
            </div>
          </div>
        </section>

        {error ? (
          <section className="xl:col-span-2">
            <EmptyState title="RelayDB API unavailable" description={error} />
          </section>
        ) : null}

        {isLoading ? (
          <section className="xl:col-span-2">
            <div className="rounded-xl border border-slate-800/80 bg-graphite-900/75 p-4 shadow-glow backdrop-blur">
              <LoadingState />
            </div>
          </section>
        ) : null}

        <EnvironmentList environments={environments} activeEnvironmentId={active?.environment?.id ?? null} selectedEnvironmentId={selectedEnvironmentId} isSwitching={isSwitching} onSwitch={mountEnvironment} />
        <ActiveEnvironmentView active={active} isSwitching={isSwitching} />
      </main>
    </div>
  );
}
