import { Cable, Database, LogOut, Plus, Search, ServerCog, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { useEnvironmentPlatform } from "../hooks/useEnvironmentPlatform";
import { AuthPanel } from "../modules/auth/AuthPanel";
import { ActiveEnvironmentView } from "../modules/environments/ActiveEnvironmentView";
import { EnvironmentList } from "../modules/environments/EnvironmentList";

export function RelayDBShell() {
  const {
    environments,
    active,
    selectedEnvironmentId,
    isLoading,
    isSwitching,
    isProvisioning,
    actingEnvironmentId,
    error,
    user,
    isAuthLoading,
    loginUser,
    registerUser,
    logoutUser,
    mountEnvironment,
    provisionEnvironment,
    startManagedEnvironment,
    stopManagedEnvironment,
    deleteManagedEnvironment,
  } = useEnvironmentPlatform();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [environmentName, setEnvironmentName] = useState("");

  async function submitEnvironment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = environmentName.trim();
    if (!name) {
      return;
    }
    await provisionEnvironment(name);
    setEnvironmentName("");
    setIsCreateOpen(false);
  }

  if (!user) {
    return <AuthPanel error={error} isLoading={isAuthLoading} onLogin={loginUser} onRegister={registerUser} />;
  }

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
        <div className="hidden rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-300 lg:block">{user.email}</div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 text-sm font-medium text-cyan-100 transition hover:border-cyan-300/60 hover:bg-cyan-300/15"
        >
          <Plus className="h-4 w-4" />
          Create
        </button>
        <button onClick={logoutUser} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-800 px-3 text-sm text-slate-300 transition hover:text-white">
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </header>

      <main className="grid flex-1 grid-cols-1 gap-4 p-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <section className="xl:col-span-2">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-800/80 bg-graphite-900/70 p-4 shadow-glow backdrop-blur lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-200">
                <ServerCog className="h-4 w-4" />
                Docker Provisioning
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Isolated PostgreSQL environments behind one stable endpoint.</h1>
              <p className="mt-2 text-sm text-slate-400">
                RelayDB creates Docker volumes and PostgreSQL containers, then routes <span className="font-mono text-cyan-100">localhost:5432</span> to the active environment.
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

        <EnvironmentList
          environments={environments}
          activeEnvironmentId={active?.environment?.id ?? null}
          selectedEnvironmentId={selectedEnvironmentId}
          isSwitching={isSwitching}
          actingEnvironmentId={actingEnvironmentId}
          onSwitch={mountEnvironment}
          onStart={startManagedEnvironment}
          onStop={stopManagedEnvironment}
          onDelete={deleteManagedEnvironment}
        />
        <ActiveEnvironmentView active={active} isSwitching={isSwitching} />
      </main>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur">
          <form onSubmit={submitEnvironment} className="w-full max-w-lg rounded-xl border border-slate-800 bg-graphite-900 p-5 shadow-glow">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-cyan-200">Provision PostgreSQL</div>
                <h2 className="mt-2 text-xl font-semibold text-white">Create isolated environment</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">RelayDB will create a Docker volume, a PostgreSQL 16 container, and attach it to relaydb-network.</p>
              </div>
              <button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-lg border border-slate-700 p-2 text-slate-400 transition hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-5 block">
              <span className="text-sm font-medium text-slate-300">Environment name</span>
              <input
                autoFocus
                value={environmentName}
                onChange={(event) => setEnvironmentName(event.target.value)}
                placeholder="Pedro Debug DB"
                className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none ring-cyan-300/30 transition placeholder:text-slate-600 focus:border-cyan-300/50 focus:ring-4"
              />
            </label>

            <div className="mt-4 grid gap-2 text-xs text-slate-400 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">Dedicated container</div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">Isolated volume</div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">Internal network only</div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setIsCreateOpen(false)} className="h-10 rounded-lg border border-slate-700 px-4 text-sm text-slate-300 transition hover:text-white">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProvisioning || !environmentName.trim()}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 text-sm font-medium text-cyan-100 transition hover:border-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {isProvisioning ? "Provisioning" : "Create environment"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
