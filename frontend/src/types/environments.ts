export interface PostgresEnvironment {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface EnvironmentsResponse {
  environments: PostgresEnvironment[];
  active_environment_id: string | null;
}

export interface ActiveEnvironmentResponse {
  environment: PostgresEnvironment | null;
  stable_endpoint: string;
}
