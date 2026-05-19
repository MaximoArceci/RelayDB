import { Cable, Database, Pencil, PlugZap, Plus, ServerCog, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { useEnvironmentPlatform } from "../hooks/useEnvironmentPlatform";
import { ActiveEnvironmentView } from "../modules/environments/ActiveEnvironmentView";
import { EnvironmentList } from "../modules/environments/EnvironmentList";

const ADD_CONNECTION_VALUE = "__add_stable_connection__";

export function RelayDBShell() {
  const {
    environments,
    connections,
    active,
    selectedEnvironmentId,
    isLoading,
    isSwitching,
    isProvisioning,
    isCreatingConnection,
    isSnapshotting,
    actingEnvironmentId,
    actingConnectionId,
    snapshots,
    error,
    mountEnvironment,
    provisionEnvironment,
    startManagedEnvironment,
    stopManagedEnvironment,
    deleteManagedEnvironment,
    snapshotEnvironment,
    restoreEnvironmentSnapshot,
    deleteEnvironmentSnapshot,
    createStableConnection,
    switchStableConnection,
    updateStableConnection,
    deleteStableConnection,
  } = useEnvironmentPlatform();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isConnectionOpen, setIsConnectionOpen] = useState(false);
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState("");
  const [environmentName, setEnvironmentName] = useState("");
  const [connectionName, setConnectionName] = useState("");
  const [connectionOwner, setConnectionOwner] = useState("");
  const [connectionPort, setConnectionPort] = useState("15432");
  const [connectionTargetId, setConnectionTargetId] = useState("");
  const selectedConnection = connections.find((connection) => connection.id === selectedConnectionId) ?? connections[0] ?? null;
  const selectedConnectionTargetId = selectedConnection?.target_environment_id ?? "";
  const selectedConnectionTarget = environments.find((environment) => environment.id === selectedConnectionTargetId) ?? null;
  const selectedConnectionString = selectedConnection ? `postgresql://postgres:postgres@localhost:${selectedConnection.stable_port}/${selectedConnectionTarget?.database ?? "app"}` : null;
  const editingConnection = editingConnectionId ? connections.find((connection) => connection.id === editingConnectionId) ?? null : null;

  useEffect(() => {
    if (connections.length === 0) {
      setSelectedConnectionId("");
      return;
    }
    if (!connections.some((connection) => connection.id === selectedConnectionId)) {
      setSelectedConnectionId(connections[0].id);
    }
  }, [connections, selectedConnectionId]);

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

  async function submitConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = connectionName.trim();
    const owner = connectionOwner.trim();
    const stablePort = Number(connectionPort);
    const targetId = connectionTargetId || environments[0]?.id;
    if (!name || !owner || !targetId || !Number.isInteger(stablePort)) {
      return;
    }
    const connection = editingConnection
      ? await updateStableConnection(editingConnection.id, name, owner, stablePort, targetId)
      : await createStableConnection(name, owner, stablePort, targetId);
    if (connection) {
      setSelectedConnectionId(connection.id);
      await mountEnvironment(connection.target_environment_id);
    }
    setConnectionName("");
    setConnectionOwner("");
    setConnectionPort(String(stablePort + 10000));
    setConnectionTargetId("");
    setEditingConnectionId(null);
    setIsConnectionOpen(false);
  }

  function openConnectionModal() {
    const usedPorts = new Set(connections.map((connection) => connection.stable_port));
    const suggestedPort = [15432, 25432, 35432].find((port) => !usedPorts.has(port)) ?? Math.min(65535, Math.max(15431, ...connections.map((connection) => connection.stable_port)) + 1);
    setConnectionPort(String(suggestedPort));
    setConnectionTargetId(selectedConnectionTargetId || selectedEnvironmentId || environments[0]?.id || "");
    setEditingConnectionId(null);
    setIsConnectionOpen(true);
  }

  function openEditConnectionModal() {
    if (!selectedConnection) {
      return;
    }
    setConnectionName(selectedConnection.name);
    setConnectionOwner(selectedConnection.owner);
    setConnectionPort(String(selectedConnection.stable_port));
    setConnectionTargetId(selectedConnection.target_environment_id);
    setEditingConnectionId(selectedConnection.id);
    setIsConnectionOpen(true);
  }

  async function deleteSelectedConnection() {
    if (!selectedConnection) {
      return;
    }
    if (!window.confirm(`Delete stable connection ${selectedConnection.name}?`)) {
      return;
    }
    try {
      const deleted = await deleteStableConnection(selectedConnection.id);
      const nextConnection = connections.find((connection) => connection.id !== deleted?.id) ?? null;
      setSelectedConnectionId(nextConnection?.id ?? "");
      if (nextConnection) {
        await mountEnvironment(nextConnection.target_environment_id);
      }
    } catch {
      // The hook restores server-backed state and exposes the error banner.
    }
  }

  function selectConnection(value: string) {
    if (value === ADD_CONNECTION_VALUE) {
      openConnectionModal();
      return;
    }
    const connection = connections.find((item) => item.id === value) ?? null;
    setSelectedConnectionId(value);
    if (connection?.target_environment_id) {
      void mountEnvironment(connection.target_environment_id);
    }
  }

  async function selectConnectionTarget(environmentId: string) {
    if (!selectedConnection) {
      return;
    }
    try {
      await switchStableConnection(selectedConnection.id, environmentId);
      await mountEnvironment(environmentId);
    } catch {
      // The hook restores server-backed state and exposes the error banner.
    }
  }

  return (
    <div className="flex min-h-screen flex-col text-slate-100">
      <header className="flex min-h-16 flex-wrap items-center gap-3 border-b border-slate-800/80 bg-graphite-950/90 px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-300/10 shadow-glow">
            <Database className="h-5 w-5 text-cyan-200" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide">RelayDB</div>
            <div className="text-xs text-slate-500">Stable PostgreSQL routing</div>
          </div>
        </div>

        <div className="hidden min-w-0 flex-1 items-center gap-2 text-xs text-slate-500 xl:flex">
          <Cable className="h-4 w-4 text-cyan-200" />
          <span className="truncate">Each stable connection keeps its own routed database.</span>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="hidden text-xs text-slate-500 sm:block">Connection</div>
          <select
            className="h-9 min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-950/80 px-3 text-sm text-slate-300 outline-none ring-cyan-300/30 transition focus:border-cyan-300/50 focus:ring-4 sm:w-64 sm:flex-none"
            value={selectedConnection?.id ?? ""}
            onChange={(event) => selectConnection(event.target.value)}
          >
            {connections.length === 0 ? <option value="">No stable connections</option> : null}
            {connections.map((connection) => (
              <option key={connection.id} value={connection.id}>
                {connection.name} - localhost:{connection.stable_port}
              </option>
            ))}
            <option value={ADD_CONNECTION_VALUE}>Add stable connection...</option>
          </select>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="hidden text-xs text-slate-500 sm:block">Routes to</div>
          <select
            className="h-9 min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-950/80 px-3 text-sm text-slate-300 outline-none ring-cyan-300/30 transition focus:border-cyan-300/50 focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50 sm:w-56 sm:flex-none"
            value={selectedConnectionTargetId || selectedEnvironmentId || ""}
            disabled={!selectedConnection || actingConnectionId === selectedConnection.id}
            onChange={(event) => selectConnectionTarget(event.target.value)}
          >
            {environments.map((environment) => (
              <option key={environment.id} value={environment.id}>
                {environment.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 text-sm font-medium text-cyan-100 transition hover:border-cyan-300/60 hover:bg-cyan-300/15"
        >
          <Plus className="h-4 w-4" />
          New environment
        </button>
      </header>

      <main className="grid flex-1 grid-cols-1 gap-4 p-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <section className="xl:col-span-2">
          <div className="grid gap-3 rounded-xl border border-slate-800/80 bg-graphite-900/70 p-4 shadow-glow backdrop-blur lg:grid-cols-[1.2fr_1fr_1fr]">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-200">
                <ServerCog className="h-4 w-4" />
                Active stable connection
              </div>
              <div className="mt-2 truncate text-xl font-semibold text-white">{selectedConnection?.name ?? "No stable connection selected"}</div>
              <div className="mt-2 truncate font-mono text-xs text-cyan-100">{selectedConnectionString ?? "Create a route to get a stable PostgreSQL URL"}</div>
              {selectedConnection ? <div className="mt-2 text-xs text-slate-500">Owner: {selectedConnection.owner}</div> : null}
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3">
              <div className="text-xs text-slate-500">Routes to</div>
              <div className="mt-1 truncate text-sm font-semibold text-white">{selectedConnectionTarget?.name ?? "No target"}</div>
              <div className="mt-2 truncate font-mono text-xs text-slate-400">
                {selectedConnectionTarget ? `${selectedConnectionTarget.host}:${selectedConnectionTarget.port}/${selectedConnectionTarget.database}` : "Choose a PostgreSQL environment"}
              </div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500">Switch behavior</div>
                  <div className="mt-1 text-sm font-semibold text-white">{actingConnectionId === selectedConnection?.id ? "Updating route" : "Ready"}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    disabled={!selectedConnection || actingConnectionId === selectedConnection?.id}
                    onClick={openEditConnectionModal}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 text-xs text-slate-300 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={!selectedConnection || actingConnectionId === selectedConnection?.id}
                    onClick={deleteSelectedConnection}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-signal-red/30 px-2.5 text-xs text-signal-red transition hover:bg-signal-red/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-2 text-xs leading-5 text-slate-400">
                Target changes are saved on this connection. Existing database client sessions must reconnect.
              </div>
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
          activeEnvironmentId={selectedConnectionTargetId || active?.environment?.id || null}
          selectedEnvironmentId={selectedConnectionTargetId || selectedEnvironmentId}
          isSwitching={isSwitching || actingConnectionId === selectedConnection?.id}
          actingEnvironmentId={actingEnvironmentId}
          snapshots={snapshots}
          onSwitch={selectedConnection ? selectConnectionTarget : mountEnvironment}
          onStart={startManagedEnvironment}
          onStop={stopManagedEnvironment}
          onDelete={deleteManagedEnvironment}
        />
        <ActiveEnvironmentView
          active={active}
          isSwitching={isSwitching}
          snapshots={snapshots}
          isSnapshotting={isSnapshotting}
          onCreateSnapshot={snapshotEnvironment}
          onRestoreSnapshot={restoreEnvironmentSnapshot}
          onDeleteSnapshot={deleteEnvironmentSnapshot}
        />
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

      {isConnectionOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur">
          <form onSubmit={submitConnection} className="w-full max-w-lg rounded-xl border border-slate-800 bg-graphite-900 p-5 shadow-glow">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-cyan-200">Stable TCP Route</div>
                <h2 className="mt-2 text-xl font-semibold text-white">{editingConnection ? "Edit stable connection" : "Dedicated developer endpoint"}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {editingConnection
                    ? "Update the owner, stable port, or default target for this route."
                    : "Assign one local TCP port to one owner or workflow. The target can change later without changing the connection string."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsConnectionOpen(false);
                  setEditingConnectionId(null);
                }}
                className="rounded-lg border border-slate-700 p-2 text-slate-400 transition hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-300">Connection name</span>
                <input
                  autoFocus
                  value={connectionName}
                  onChange={(event) => setConnectionName(event.target.value)}
                  placeholder="max-local"
                  className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none ring-cyan-300/30 transition placeholder:text-slate-600 focus:border-cyan-300/50 focus:ring-4"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-300">Owner</span>
                <input
                  value={connectionOwner}
                  onChange={(event) => setConnectionOwner(event.target.value)}
                  placeholder="max"
                  className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none ring-cyan-300/30 transition placeholder:text-slate-600 focus:border-cyan-300/50 focus:ring-4"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-300">Stable port</span>
                <input
                  type="number"
                  min={1}
                  max={65535}
                  value={connectionPort}
                  onChange={(event) => setConnectionPort(event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none ring-cyan-300/30 transition focus:border-cyan-300/50 focus:ring-4"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-300">{editingConnection ? "Default target" : "Initial target"}</span>
                <select
                  value={connectionTargetId || environments[0]?.id || ""}
                  onChange={(event) => setConnectionTargetId(event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none ring-cyan-300/30 transition focus:border-cyan-300/50 focus:ring-4"
                >
                  {environments.map((environment) => (
                    <option key={environment.id} value={environment.id}>
                      {environment.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">Connection string</div>
              <div className="mt-2 truncate font-mono text-sm text-cyan-50">
                postgresql://postgres:postgres@localhost:{connectionPort || "15432"}/app
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsConnectionOpen(false);
                  setEditingConnectionId(null);
                }}
                className="h-10 rounded-lg border border-slate-700 px-4 text-sm text-slate-300 transition hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={(editingConnection ? actingConnectionId === editingConnection.id : isCreatingConnection) || !connectionName.trim() || !connectionOwner.trim() || environments.length === 0}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-signal-green/30 bg-signal-green/10 px-4 text-sm font-medium text-signal-green transition hover:border-signal-green/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PlugZap className="h-4 w-4" />
                {editingConnection ? (actingConnectionId === editingConnection.id ? "Saving" : "Save route") : isCreatingConnection ? "Creating" : "Create route"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
