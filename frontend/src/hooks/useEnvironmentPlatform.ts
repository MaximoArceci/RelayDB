import { useEffect } from "react";
import { clearAuthToken, getCurrentUser, login, logout, register, setAuthToken } from "../api/auth";
import { createEnvironment, deleteEnvironment, getActiveEnvironment, getEnvironments, startEnvironment, stopEnvironment, switchEnvironment } from "../api/environments";
import { useEnvironmentStore } from "../stores/environmentStore";

export function useEnvironmentPlatform() {
  const state = useEnvironmentStore();
  const setState = useEnvironmentStore((store) => store.setState);

  useEffect(() => {
    const controller = new AbortController();
    setState({ isAuthLoading: true, error: null });

    getCurrentUser(controller.signal)
      .then((user) => {
        setState({ user, isAuthLoading: false });
      })
      .catch(() => {
        clearAuthToken();
        setState({ user: null, isAuthLoading: false, isLoading: false });
      });

    return () => controller.abort();
  }, [setState]);

  useEffect(() => {
    if (!state.user) {
      return;
    }

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
  }, [setState, state.user]);

  async function loginUser(email: string, password: string) {
    setState({ isAuthLoading: true, error: null });
    try {
      const result = await login({ email, password });
      setAuthToken(result.token);
      setState({ user: result.user, isAuthLoading: false, isLoading: true, error: null });
    } catch (error) {
      setState({ isAuthLoading: false, error: error instanceof Error ? error.message : "Unable to login" });
    }
  }

  async function registerUser(name: string, email: string, password: string) {
    setState({ isAuthLoading: true, error: null });
    try {
      const result = await register({ name, email, password });
      setAuthToken(result.token);
      setState({ user: result.user, isAuthLoading: false, isLoading: true, error: null });
    } catch (error) {
      setState({ isAuthLoading: false, error: error instanceof Error ? error.message : "Unable to register" });
    }
  }

  async function logoutUser() {
    await logout();
    setState({
      user: null,
      environments: [],
      active: null,
      selectedEnvironmentId: null,
      isLoading: false,
      isSwitching: false,
      isProvisioning: false,
      actingEnvironmentId: null,
      error: null,
    });
  }

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
    const [environments, active] = await Promise.all([getEnvironments(), getActiveEnvironment()]);
    setState({
      environments: environments.environments,
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

  return {
    ...state,
    loginUser,
    registerUser,
    logoutUser,
    mountEnvironment,
    provisionEnvironment,
    startManagedEnvironment,
    stopManagedEnvironment,
    deleteManagedEnvironment,
  };
}
