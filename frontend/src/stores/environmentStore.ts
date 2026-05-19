import { create } from "zustand";
import type { ActiveEnvironmentResponse, PostgresEnvironment } from "../types/environments";
import type { Snapshot } from "../types/snapshots";

interface EnvironmentState {
  environments: PostgresEnvironment[];
  snapshots: Snapshot[];
  active: ActiveEnvironmentResponse | null;
  selectedEnvironmentId: string | null;
  isLoading: boolean;
  isSwitching: boolean;
  isProvisioning: boolean;
  isSnapshotting: boolean;
  actingEnvironmentId: string | null;
  error: string | null;
  setState: (state: Partial<EnvironmentState>) => void;
  setSelectedEnvironmentId: (environmentId: string) => void;
}

export const useEnvironmentStore = create<EnvironmentState>((set) => ({
  environments: [],
  snapshots: [],
  active: null,
  selectedEnvironmentId: null,
  isLoading: true,
  isSwitching: false,
  isProvisioning: false,
  isSnapshotting: false,
  actingEnvironmentId: null,
  error: null,
  setState: (state) => set(state),
  setSelectedEnvironmentId: (selectedEnvironmentId) => set({ selectedEnvironmentId }),
}));
