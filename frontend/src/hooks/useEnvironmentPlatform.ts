import { useEffect } from "react";
import { createConnection, deleteConnection, getConnections, switchConnection, updateConnection } from "../api/connections";
import { createEnvironment, deleteEnvironment, getActiveEnvironment, getEnvironments, startEnvironment, stopEnvironment, switchEnvironment } from "../api/environments";
import { createSnapshot, deleteSnapshot, downloadSnapshot, getSnapshots, restoreSnapshot, uploadSnapshot } from "../api/snapshots";
import { useEnvironmentStore } from "../stores/environmentStore";

export function useEnvironmentPlatform() {
  const state = useEnvironmentStore();
  const setState = useEnvironmentStore((store) => store.setState);

  useEffect(() => {
    const controller = new AbortController();
    setState({ isLoading: true, error: null });

    Promise.all([getEnvironments(controller.signal), getActiveEnvironment(controller.signal), getSnapshots(controller.signal), getConnections(controller.signal)])
      .then(([environments, active, snapshots, connections]) => {
        setState({
          environments: environments.environments,
          connections: connections.connections,
          snapshots: snapshots.snapshots,
          active,
          selectedEnvironmentId: environments.active_environment_id,
          isLoading: false,
        });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({ error: error instanceof Error ? error.message : "Unable to load environments", isLoading: false });
        }
      });

    return () => controller.abort();
  }, [setState]);

  async function mountEnvironment(environmentId: string) {
    const previousActive = state.active;
    const nextEnvironment = state.environments.find((environment) => environment.id === environmentId);

    if (!nextEnvironment || environmentId === state.active?.environment?.id) {
      return;
    }

    setState({
      selectedEnvironmentId: environmentId,
      isSwitching: true,
      active: previousActive
        ? {
            ...previousActive,
            environment: nextEnvironment,
          }
        : null,
    });

    try {
      const result = await switchEnvironment(environmentId);
      setState({
        active: { environment: result.active, stable_endpoint: result.stable_endpoint },
        isSwitching: false,
        error: null,
      });
    } catch (error) {
      setState({
        active: previousActive,
        selectedEnvironmentId: previousActive?.environment?.id ?? null,
        isSwitching: false,
        error: error instanceof Error ? error.message : "Unable to switch environment",
      });
    }
  }

  async function refreshEnvironments() {
    const [environments, active, snapshots, connections] = await Promise.all([getEnvironments(), getActiveEnvironment(), getSnapshots(), getConnections()]);
    setState({
      environments: environments.environments,
      connections: connections.connections,
      snapshots: snapshots.snapshots,
      active,
      selectedEnvironmentId: environments.active_environment_id,
      error: null,
    });
  }

  async function provisionEnvironment(name: string) {
    setState({ isProvisioning: true, error: null });
    try {
      const environment = await createEnvironment({ name });
      setState({
        environments: [...state.environments, environment],
        active: state.active?.environment ? state.active : { environment, stable_endpoint: "localhost:5432" },
        selectedEnvironmentId: state.selectedEnvironmentId ?? environment.id,
        isProvisioning: false,
        error: null,
      });
      await refreshEnvironments();
    } catch (error) {
      setState({
        isProvisioning: false,
        error: error instanceof Error ? error.message : "Unable to provision environment",
      });
    }
  }

  async function startManagedEnvironment(environmentId: string) {
    setState({ actingEnvironmentId: environmentId, error: null });
    try {
      await startEnvironment(environmentId);
      await refreshEnvironments();
      setState({ actingEnvironmentId: null });
    } catch (error) {
      setState({ actingEnvironmentId: null, error: error instanceof Error ? error.message : "Unable to start environment" });
    }
  }

  async function stopManagedEnvironment(environmentId: string) {
    setState({ actingEnvironmentId: environmentId, error: null });
    try {
      await stopEnvironment(environmentId);
      await refreshEnvironments();
      setState({ actingEnvironmentId: null });
    } catch (error) {
      setState({ actingEnvironmentId: null, error: error instanceof Error ? error.message : "Unable to stop environment" });
    }
  }

  async function deleteManagedEnvironment(environmentId: string) {
    setState({ actingEnvironmentId: environmentId, error: null });
    try {
      await deleteEnvironment(environmentId, true);
      await refreshEnvironments();
      setState({ actingEnvironmentId: null });
    } catch (error) {
      setState({ actingEnvironmentId: null, error: error instanceof Error ? error.message : "Unable to delete environment" });
    }
  }

  async function snapshotEnvironment(environmentId: string, name: string) {
    setState({ isSnapshotting: true, error: null });
    try {
      await createSnapshot(environmentId, name);
      await refreshEnvironments();
      setState({ isSnapshotting: false });
    } catch (error) {
      setState({ isSnapshotting: false, error: error instanceof Error ? error.message : "Unable to create snapshot" });
    }
  }

  async function importEnvironmentSnapshot(environmentId: string, name: string, file: File) {
    setState({ isSnapshotting: true, error: null });
    try {
      await uploadSnapshot(environmentId, name, file);
      await refreshEnvironments();
      setState({ isSnapshotting: false });
    } catch (error) {
      setState({ isSnapshotting: false, error: error instanceof Error ? error.message : "Unable to upload snapshot" });
    }
  }

  async function downloadEnvironmentSnapshot(snapshotId: string, name: string) {
    setState({ error: null });
    try {
      const blob = await downloadSnapshot(snapshotId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${name}.dump`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setState({ error: error instanceof Error ? error.message : "Unable to download snapshot" });
    }
  }

  async function restoreEnvironmentSnapshot(snapshotId: string, environmentId: string) {
    setState({ isSnapshotting: true, error: null });
    try {
      await restoreSnapshot(snapshotId, environmentId);
      await refreshEnvironments();
      setState({ isSnapshotting: false });
    } catch (error) {
      setState({ isSnapshotting: false, error: error instanceof Error ? error.message : "Unable to restore snapshot" });
    }
  }

  async function deleteEnvironmentSnapshot(snapshotId: string) {
    setState({ isSnapshotting: true, error: null });
    try {
      await deleteSnapshot(snapshotId);
      await refreshEnvironments();
      setState({ isSnapshotting: false });
    } catch (error) {
      setState({ isSnapshotting: false, error: error instanceof Error ? error.message : "Unable to delete snapshot" });
    }
  }

  async function createStableConnection(name: string, owner: string, stablePort: number, targetEnvironmentId: string) {
    setState({ isCreatingConnection: true, error: null });
    try {
      const connection = await createConnection({ name, owner, stable_port: stablePort, target_environment_id: targetEnvironmentId });
      setState({ connections: [...state.connections, connection], selectedEnvironmentId: targetEnvironmentId });
      await refreshEnvironments();
      setState({ isCreatingConnection: false });
      return connection;
    } catch (error) {
      setState({ isCreatingConnection: false, error: error instanceof Error ? error.message : "Unable to create stable connection" });
      throw error;
    }
  }

  async function switchStableConnection(connectionId: string, environmentId: string) {
    const previousConnections = state.connections;
    const nextEnvironment = state.environments.find((environment) => environment.id === environmentId);

    setState({ actingConnectionId: connectionId, error: null });
    try {
      const connection = await switchConnection(connectionId, environmentId);
      setState({
        connections: state.connections.map((item) => (item.id === connection.id ? connection : item)),
        selectedEnvironmentId: environmentId,
        active: nextEnvironment
          ? {
              environment: nextEnvironment,
              stable_endpoint: `localhost:${connection.stable_port}`,
            }
          : state.active,
      });
      await refreshEnvironments();
      setState({ actingConnectionId: null });
      return connection;
    } catch (error) {
      setState({
        connections: previousConnections,
        actingConnectionId: null,
        error: error instanceof Error ? error.message : "Unable to switch stable connection",
      });
      throw error;
    }
  }

  async function updateStableConnection(connectionId: string, name: string, owner: string, stablePort: number, targetEnvironmentId: string) {
    const previousConnections = state.connections;
    const nextEnvironment = state.environments.find((environment) => environment.id === targetEnvironmentId);

    setState({ actingConnectionId: connectionId, error: null });
    try {
      const connection = await updateConnection(connectionId, {
        name,
        owner,
        stable_port: stablePort,
        target_environment_id: targetEnvironmentId,
      });
      setState({
        connections: state.connections.map((item) => (item.id === connection.id ? connection : item)),
        selectedEnvironmentId: targetEnvironmentId,
        active: nextEnvironment
          ? {
              environment: nextEnvironment,
              stable_endpoint: `localhost:${connection.stable_port}`,
            }
          : state.active,
      });
      await refreshEnvironments();
      setState({ actingConnectionId: null });
      return connection;
    } catch (error) {
      setState({
        connections: previousConnections,
        actingConnectionId: null,
        error: error instanceof Error ? error.message : "Unable to update stable connection",
      });
      throw error;
    }
  }

  async function deleteStableConnection(connectionId: string) {
    const previousConnections = state.connections;
    setState({ actingConnectionId: connectionId, error: null });
    try {
      const connection = await deleteConnection(connectionId);
      setState({ connections: state.connections.filter((item) => item.id !== connection.id) });
      await refreshEnvironments();
      setState({ actingConnectionId: null });
      return connection;
    } catch (error) {
      setState({
        connections: previousConnections,
        actingConnectionId: null,
        error: error instanceof Error ? error.message : "Unable to delete stable connection",
      });
      throw error;
    }
  }

  return {
    ...state,
    mountEnvironment,
    provisionEnvironment,
    startManagedEnvironment,
    stopManagedEnvironment,
    deleteManagedEnvironment,
    snapshotEnvironment,
    importEnvironmentSnapshot,
    downloadEnvironmentSnapshot,
    restoreEnvironmentSnapshot,
    deleteEnvironmentSnapshot,
    createStableConnection,
    switchStableConnection,
    updateStableConnection,
    deleteStableConnection,
  };
}
