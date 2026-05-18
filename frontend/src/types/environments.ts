export interface PostgresEnvironment {
  id: string;
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
}

export interface EnvironmentsResponse {
  environments: PostgresEnvironment[];
  active_environment_id: string | null;
}

export interface ActiveEnvironmentResponse {
  environment: PostgresEnvironment | null;
  stable_endpoint: string;
}
