import { useEffect } from "react";
import { getActiveEnvironment, getEnvironments, switchEnvironment } from "../api/environments";
import { useEnvironmentStore } from "../stores/environmentStore";

export function useEnvironmentPlatform() {
  const state = useEnvironmentStore();
  const setState = useEnvironmentStore((store) => store.setState);

  useEffect(() => {
    const controller = new AbortController();
    setState({ isLoading: true, error: null });

    Promise.all([getEnvironments(controller.signal), getActiveEnvironment(controller.signal)])
      .then(([environments, active]) => {
        setState({
          environments: environments.environments,
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

  return { ...state, mountEnvironment };
}
