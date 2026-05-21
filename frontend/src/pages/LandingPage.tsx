import {
  ArrowRight,
  Blocks,
  Cable,
  CheckCircle2,
  Copy,
  Database,
  GitBranch,
  Network,
  RefreshCw,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";

const capabilities = [
  {
    icon: Cable,
    title: "Stable local endpoints",
    description: "Keep one PostgreSQL URL while RelayDB switches the database behind it.",
  },
  {
    icon: GitBranch,
    title: "Per-workflow routing",
    description: "Give each teammate, branch, or task its own stable connection and target memory.",
  },
  {
    icon: Blocks,
    title: "Disposable environments",
    description: "Create isolated Postgres containers for testing, demos, QA, and debugging.",
  },
];

const workflow = [
  {
    step: "01",
    title: "Create a database environment",
    description: "RelayDB provisions an isolated PostgreSQL container and volume for a branch, bug, demo, or QA scenario.",
  },
  {
    step: "02",
    title: "Point a stable connection at it",
    description: "Your app keeps using the same localhost connection string while RelayDB changes the target behind the route.",
  },
  {
    step: "03",
    title: "Snapshot or switch whenever needed",
    description: "Freeze known-good states, restore them into another environment, or move a route to a fresh database.",
  },
];

const useCases = [
  "Reproduce a production bug without destroying your local database.",
  "Give every branch a clean PostgreSQL target with the same application URL.",
  "Reset QA or demo data from a known snapshot before a review.",
  "Let teammates share database states without passing around manual SQL steps.",
];

export function LandingPage() {
  return (
    <div className="min-h-screen text-text">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5">
        <a href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center border border-accent bg-accent shadow-glow">
            <Database className="h-5 w-5 text-app" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide">RelayDB</div>
            <div className="text-xs text-subtle">Stable PostgreSQL routing</div>
          </div>
        </a>
        <a
          href="/app/"
          className="inline-flex h-10 items-center gap-2 border border-accent bg-accent px-4 text-sm font-medium text-app transition hover:border-accent-soft hover:bg-accent-soft"
        >
          Open app
          <ArrowRight className="h-4 w-4" />
        </a>
      </header>

      <main>
        <section className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-7xl items-center gap-10 px-5 pb-14 pt-8 lg:grid-cols-[minmax(0,1fr)_520px]">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 border border-border bg-surface/75 px-3 py-2 text-xs font-medium uppercase tracking-[0.16em] text-accent">
              <ShieldCheck className="h-4 w-4" />
              Local infra for database-heavy teams
            </div>
            <h1 className="mt-7 max-w-4xl text-5xl font-semibold leading-tight text-text sm:text-6xl lg:text-7xl">
              RelayDB
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted sm:text-xl sm:leading-9">
              RelayDB lets developers run multiple local PostgreSQL databases without changing the connection string in their app every time they switch context.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
              Create disposable database environments, route stable localhost ports to the right target, and capture snapshots of useful states so debugging, QA, and demos start from known data.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="/app/"
                className="inline-flex h-12 items-center justify-center gap-2 border border-accent bg-accent px-5 text-sm font-semibold text-app shadow-glow transition hover:border-accent-soft hover:bg-accent-soft"
              >
                Launch RelayDB
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex h-12 items-center justify-center border border-border bg-surface/70 px-5 text-sm font-medium text-muted transition hover:border-accent/60 hover:text-text"
              >
                How it works
              </a>
            </div>
          </div>

          <div className="border border-border bg-surface/80 p-4 shadow-glow backdrop-blur">
            <div className="border border-border bg-app p-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-accent">
                  <TerminalSquare className="h-4 w-4" />
                  Stable route
                </div>
                <div className="text-xs text-success">online</div>
              </div>
              <div className="mt-5 space-y-4">
                <div>
                  <div className="text-xs text-subtle">Application URL</div>
                  <div className="mt-2 border border-border bg-surface px-3 py-3 font-mono text-sm text-text">
                    postgresql://postgres:postgres@localhost:15432/app
                  </div>
                </div>
                <div className="grid gap-2 border border-border bg-surface/70 p-3">
                  <RouteLine from="localhost:15432" to="feature-auth-db" active />
                  <RouteLine from="localhost:25432" to="qa-clean-room" />
                  <RouteLine from="localhost:35432" to="demo-baseline" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Metric label="Current target" value="feature-auth-db" />
                  <Metric label="Snapshot" value="qa-baseline.dump" />
                  <Metric label="Owner" value="backend-team" />
                  <Metric label="Mode" value="raw TCP forward" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-surface/45">
          <div className="mx-auto grid w-full max-w-7xl gap-3 px-5 py-8 md:grid-cols-3">
            {capabilities.map((item) => (
              <div key={item.title} className="border border-border bg-app/70 p-5">
                <item.icon className="h-5 w-5 text-accent" />
                <h2 className="mt-4 text-base font-semibold text-text">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[360px_minmax(0,1fr)]" id="how-it-works">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-accent">What it solves</div>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-text sm:text-4xl">
              Local database work stops being tied to one fragile state.
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              Without RelayDB, a developer usually has one local Postgres instance. Testing a branch, importing QA data, reproducing a bug, or resetting a demo can overwrite the same database and force constant connection-string edits.
            </p>
          </div>
          <div className="grid gap-3">
            {workflow.map((item) => (
              <div key={item.step} className="grid gap-4 border border-border bg-surface/70 p-5 sm:grid-cols-[72px_minmax(0,1fr)]">
                <div className="font-mono text-sm text-accent">{item.step}</div>
                <div>
                  <h3 className="text-lg font-semibold text-text">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-surface/45">
          <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-16 lg:grid-cols-[minmax(0,1fr)_430px]">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-accent">For daily development</div>
              <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-text sm:text-4xl">
                Keep the application stable while the database target changes.
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">
                Your backend, ORM, IDE, and database client can all keep using the same URL. RelayDB owns the routing layer, so switching from a clean branch database to a restored bug snapshot is a control-plane action instead of an app configuration change.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {useCases.map((item) => (
                  <div key={item} className="flex gap-3 border border-border bg-app/70 p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                    <div className="text-sm leading-6 text-muted">{item}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border border-border bg-app p-4">
              <div className="flex items-center gap-2 border-b border-border pb-3 text-xs uppercase tracking-[0.16em] text-accent">
                <Network className="h-4 w-4" />
                Mental model
              </div>
              <div className="mt-5 space-y-3">
                <FlowNode icon={Copy} title="One URL" value="localhost:15432/app" />
                <FlowArrow />
                <FlowNode icon={RefreshCw} title="RelayDB route" value="switch target without changing clients" />
                <FlowArrow />
                <FlowNode icon={Database} title="Many possible targets" value="branch DB, QA DB, demo DB, bug snapshot" />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-14 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Ready to inspect it</div>
            <h2 className="mt-3 text-2xl font-semibold text-text">Open the control plane and choose a stable connection.</h2>
          </div>
          <a
            href="/app/"
            className="inline-flex h-12 items-center justify-center gap-2 border border-accent bg-accent px-5 text-sm font-semibold text-app shadow-glow transition hover:border-accent-soft hover:bg-accent-soft"
          >
            Open RelayDB
            <ArrowRight className="h-4 w-4" />
          </a>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-surface px-3 py-3">
      <div className="text-xs text-subtle">{label}</div>
      <div className="mt-1 truncate font-mono text-sm text-text">{value}</div>
    </div>
  );
}

function RouteLine({ from, to, active = false }: { from: string; to: string; active?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-xs">
      <div className="truncate font-mono text-muted">{from}</div>
      <ArrowRight className={active ? "h-3.5 w-3.5 text-accent" : "h-3.5 w-3.5 text-subtle"} />
      <div className={active ? "truncate font-mono text-accent" : "truncate font-mono text-muted"}>{to}</div>
    </div>
  );
}

function FlowNode({ icon: Icon, title, value }: { icon: typeof Database; title: string; value: string }) {
  return (
    <div className="border border-border bg-surface p-4">
      <Icon className="h-5 w-5 text-accent" />
      <div className="mt-3 text-sm font-semibold text-text">{title}</div>
      <div className="mt-1 break-words font-mono text-xs leading-5 text-muted">{value}</div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex justify-center">
      <ArrowRight className="h-5 w-5 rotate-90 text-accent" />
    </div>
  );
}
