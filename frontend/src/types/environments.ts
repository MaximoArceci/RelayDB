export interface PostgresEnvironment {
  id: string;
  project_id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  container_name?: string | null;
  volume_name?: string | null;
  status: string;
  created_at?: string | null;
  managed: boolean;
}

export interface CreateEnvironmentPayload {
  name: string;
  project_id: string;
}

export interface EnvironmentsResponse {
  environments: PostgresEnvironment[];
  active_environment_id: string | null;
}

export interface ActiveEnvironmentResponse {
  environment: PostgresEnvironment | null;
  stable_endpoint: string;
}

export interface SqlExecutionResponse {
  columns: string[];
  rows: Record<string, unknown>[];
  row_count: number;
  command: string;
}
