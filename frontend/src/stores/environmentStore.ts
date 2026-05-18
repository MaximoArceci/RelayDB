import { create } from "zustand";
import type { User } from "../types/auth";
import type { ActiveEnvironmentResponse, PostgresEnvironment } from "../types/environments";

interface EnvironmentState {
  environments: PostgresEnvironment[];
  active: ActiveEnvironmentResponse | null;
  selectedEnvironmentId: string | null;
  isLoading: boolean;
  isSwitching: boolean;
  isProvisioning: boolean;
  actingEnvironmentId: string | null;
  user: User | null;
  isAuthLoading: boolean;
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
  isProvisioning: false,
  actingEnvironmentId: null,
  user: null,
  isAuthLoading: true,
  error: null,
  setState: (state) => set(state),
  setSelectedEnvironmentId: (selectedEnvironmentId) => set({ selectedEnvironmentId }),
}));
