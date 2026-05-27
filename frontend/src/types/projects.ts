export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
}

export interface ProjectsResponse {
  projects: Project[];
  active_project_id: string;
}

export interface ActiveProjectResponse {
  project: Project;
}
