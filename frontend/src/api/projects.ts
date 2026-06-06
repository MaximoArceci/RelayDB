import { apiFetch, apiGet } from "./client";
import { responseError } from "./errors";
import type { ActiveProjectResponse, CreateProjectPayload, Project, ProjectsResponse } from "../types/projects";

export function getProjects(signal?: AbortSignal) {
  return apiGet<ProjectsResponse>("/api/v1/projects", signal);
}

export async function createProject(payload: CreateProjectPayload) {
  const response = await apiFetch("/api/v1/projects", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await responseError(response, `Project creation failed with ${response.status}`);
  }

  return response.json() as Promise<Project>;
}

export async function switchProject(projectId: string) {
  const response = await apiFetch(`/api/v1/projects/active/${projectId}`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw await responseError(response, `Project switch failed with ${response.status}`);
  }

  return response.json() as Promise<ActiveProjectResponse>;
}
