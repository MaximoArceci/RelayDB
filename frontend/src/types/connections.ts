export interface ConnectionSlot {
  id: string;
  name: string;
  owner: string;
  stable_port: number;
  target_environment_id: string;
  created_at: string;
  status: string;
}

export interface CreateConnectionPayload {
  name: string;
  owner: string;
  stable_port: number;
  target_environment_id: string;
}

export type UpdateConnectionPayload = Partial<CreateConnectionPayload>;

export interface ConnectionsResponse {
  connections: ConnectionSlot[];
}
