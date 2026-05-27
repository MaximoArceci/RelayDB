import { Database, FolderKanban, Plus, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { Modal } from "../components/Modal";
import { useEnvironmentPlatform } from "../hooks/useEnvironmentPlatform";

export function ProjectsPage() {
  const { projects, activeProjectId, isLoading, isCreatingProject, error, createWorkspaceProject, switchWorkspaceProject } = useEnvironmentPlatform();
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  async function openProject(projectId: string) {
    await switchWorkspaceProject(projectId);
    window.history.pushState(null, "", `/app/projects/${projectId}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  async function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = projectName.trim();
    if (!name) {
      return;
    }
    const project = await createWorkspaceProject(name, projectDescription.trim());
    setProjectName("");
    setProjectDescription("");
    setIsProjectOpen(false);
    await openProject(project.id);
  }

  return (
    <div className="min-h-screen bg-app text-text">
      <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-app/90 px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-none border border-accent bg-accent shadow-glow">
            <Database className="h-5 w-5 text-app" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide">RelayDB</div>
            <div className="text-xs text-subtle">Project workspaces</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsProjectOpen(true)}
          className="inline-flex h-9 items-center gap-2 rounded-none border border-accent bg-accent px-3 text-sm font-medium text-app transition hover:bg-accent/90"
        >
          <Plus className="h-4 w-4" />
          New project
        </button>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 py-6">
        <div className="mb-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-accent">
            <FolderKanban className="h-4 w-4" />
            Projects
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-text">Choose a workspace</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted/80">Each project keeps its own PostgreSQL environments, stable routes, and dumps.</p>
        </div>

        {error ? <EmptyState title="RelayDB API unavailable" description={error} /> : null}

        {isLoading ? (
          <div className="rounded-none border border-border/80 bg-surface/75 p-4 shadow-glow backdrop-blur">
            <LoadingState />
          </div>
        ) : null}

        {!isLoading && projects.length === 0 ? (
          <EmptyState title="No projects" description="Create a project to start grouping databases and snapshots." />
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => void openProject(project.id)}
              className={`min-h-40 rounded-none border p-4 text-left transition ${
                project.id === activeProjectId ? "border-accent bg-accent/15 shadow-glow" : "border-border bg-surface/75 hover:border-accent/60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold text-text">{project.name}</div>
                  <div className="mt-1 font-mono text-xs text-subtle">{project.id}</div>
                </div>
                <FolderKanban className="h-5 w-5 shrink-0 text-accent" />
              </div>
              <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted/80">{project.description || "Databases, routes, and dumps for this workspace."}</p>
              <div className="mt-4 text-xs text-subtle">Created {new Date(project.created_at).toLocaleDateString()}</div>
            </button>
          ))}
        </div>
      </main>

      <Modal open={isProjectOpen} onClose={() => setIsProjectOpen(false)}>
        <form onSubmit={submitProject} className="mx-auto w-full max-w-lg rounded-none border border-border bg-surface p-5 shadow-glow">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-accent">Project Workspace</div>
              <h2 className="mt-2 text-xl font-semibold text-text">Create project</h2>
              <p className="mt-2 text-sm leading-6 text-muted/80">Group related PostgreSQL environments, stable routes, and dumps into one workspace.</p>
            </div>
            <button type="button" onClick={() => setIsProjectOpen(false)} className="rounded-none border border-border-strong p-2 text-muted/80 transition hover:text-text">
              <X className="h-4 w-4" />
            </button>
          </div>

          <label className="mt-5 block">
            <span className="text-sm font-medium text-muted">Project name</span>
            <input
              autoFocus
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="Billing service"
              className="mt-2 h-11 w-full rounded-none border border-border-strong bg-app px-3 text-sm text-text outline-none ring-accent/30 transition placeholder:text-subtle/70 focus:border-accent/50 focus:ring-4"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-medium text-muted">Description</span>
            <textarea
              value={projectDescription}
              onChange={(event) => setProjectDescription(event.target.value)}
              placeholder="Local databases and snapshots for this product."
              className="mt-2 min-h-24 w-full resize-none rounded-none border border-border-strong bg-app px-3 py-2 text-sm text-text outline-none ring-accent/30 transition placeholder:text-subtle/70 focus:border-accent/50 focus:ring-4"
            />
          </label>

          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setIsProjectOpen(false)} className="h-10 rounded-none border border-border-strong px-4 text-sm text-muted transition hover:text-text">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreatingProject || !projectName.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-none border border-accent bg-accent px-4 text-sm font-medium text-app transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {isCreatingProject ? "Creating" : "Create project"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
