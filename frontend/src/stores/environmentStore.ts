import { create } from "zustand";
import type { ConnectionSlot } from "../types/connections";
import type { ActiveEnvironmentResponse, PostgresEnvironment } from "../types/environments";
import type { Project } from "../types/projects";
import type { Snapshot } from "../types/snapshots";

interface EnvironmentState {
  projects: Project[];
  activeProjectId: string;
  environments: PostgresEnvironment[];
  connections: ConnectionSlot[];
  snapshots: Snapshot[];
  active: ActiveEnvironmentResponse | null;
  selectedEnvironmentId: string | null;
  isLoading: boolean;
  isSwitching: boolean;
  isProvisioning: boolean;
  isCreatingConnection: boolean;
  actingConnectionId: string | null;
  isCreatingProject: boolean;
  isSnapshotting: boolean;
  actingEnvironmentId: string | null;
  error: string | null;
  setState: (state: Partial<EnvironmentState>) => void;
  setSelectedEnvironmentId: (environmentId: string) => void;
}

export const useEnvironmentStore = create<EnvironmentState>((set) => ({
  projects: [],
  activeProjectId: "default",
  environments: [],
  connections: [],
  snapshots: [],
  active: null,
  selectedEnvironmentId: null,
  isLoading: true,
  isSwitching: false,
  isProvisioning: false,
  isCreatingConnection: false,
  actingConnectionId: null,
  isCreatingProject: false,
  isSnapshotting: false,
  actingEnvironmentId: null,
  error: null,
  setState: (state) => set(state),
  setSelectedEnvironmentId: (selectedEnvironmentId) => set({ selectedEnvironmentId }),
}));
