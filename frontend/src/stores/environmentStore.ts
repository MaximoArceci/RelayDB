import { create } from "zustand";
import type { ActiveEnvironmentResponse, PostgresEnvironment } from "../types/environments";

interface EnvironmentState {
  environments: PostgresEnvironment[];
  active: ActiveEnvironmentResponse | null;
  selectedEnvironmentId: string | null;
  isLoading: boolean;
  isSwitching: boolean;
  error: string | null;
  setState: (state: Partial<EnvironmentState>) => void;
  setSelectedEnvironmentId: (environmentId: string) => void;
}

export const useEnvironmentStore = create<EnvironmentState>((set) => ({
  environments: [],
  active: null,
  selectedEnvironmentId: null,
  isLoading: true,
  isSwitching: false,
  error: null,
  setState: (state) => set(state),
  setSelectedEnvironmentId: (selectedEnvironmentId) => set({ selectedEnvironmentId }),
}));
