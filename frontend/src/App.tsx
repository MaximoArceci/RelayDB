import { RelayDBShell } from "./layouts/RelayDBShell";
import { LandingPage } from "./pages/LandingPage";

export function App() {
  if (!window.location.pathname.startsWith("/app")) {
    return <LandingPage />;
  }

  return <RelayDBShell />;
}
