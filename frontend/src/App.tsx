import { RelayDBShell } from "./layouts/RelayDBShell";
import { LandingPage } from "./pages/LandingPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { useEffect, useState } from "react";

export function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    function syncPath() {
      setPath(window.location.pathname);
    }
    window.addEventListener("popstate", syncPath);
    return () => window.removeEventListener("popstate", syncPath);
  }, []);

  if (!path.startsWith("/app")) {
    return <LandingPage />;
  }

  if (!path.startsWith("/app/projects/")) {
    return <ProjectsPage />;
  }

  return <RelayDBShell />;
}
