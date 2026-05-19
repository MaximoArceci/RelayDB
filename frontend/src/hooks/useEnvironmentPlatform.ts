import { useEffect } from "react";
import { createEnvironment, deleteEnvironment, getActiveEnvironment, getEnvironments, startEnvironment, stopEnvironment, switchEnvironment } from "../api/environments";
import { createSnapshot, deleteSnapshot, getSnapshots, restoreSnapshot } from "../api/snapshots";
import { useEnvironmentStore } from "../stores/environmentStore";

export function useEnvironmentPlatform() {
  const state = useEnvironmentStore();
  const setState = useEnvironmentStore((store) => store.setState);

  useEffect(() => {
    const controller = new AbortController();
    setState({ isLoading: true, error: null });

    Promise.all([getEnvironments(controller.signal), getActiveEnvironment(controller.signal), getSnapshots(controller.signal)])
      .then(([environments, active, snapshots]) => {
        setState({
          environments: environments.environments,
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
    const [environments, active, snapshots] = await Promise.all([getEnvironments(), getActiveEnvironment(), getSnapshots()]);
    setState({
      environments: environments.environments,
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

  return {
    ...state,
    mountEnvironment,
    provisionEnvironment,
    startManagedEnvironment,
    stopManagedEnvironment,
    deleteManagedEnvironment,
    snapshotEnvironment,
    restoreEnvironmentSnapshot,
    deleteEnvironmentSnapshot,
  };
}
