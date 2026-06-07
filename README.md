# RelayDB

RelayDB is a local developer infrastructure tool for teams that need reproducible PostgreSQL environments.

It gives application developers stable local PostgreSQL endpoints while RelayDB switches the target database behind those endpoints:

```text
postgresql://postgres:postgres@localhost:15432/app
postgresql://postgres:postgres@localhost:25432/app
postgresql://postgres:postgres@localhost:35432/app
```

Behind each stable endpoint, RelayDB can provision isolated PostgreSQL containers, switch routed targets, freeze database state as snapshots, restore snapshots into managed environments, and run SQL directly from the control UI or CLI.

## Screenshots

### Landing

![RelayDB landing](docs/assets/relaydb-landing.png)

### Project Workspaces

![RelayDB projects](docs/assets/relaydb-projects.png)

### Control Dashboard

![RelayDB dashboard](docs/assets/relaydb-dashboard-current.png)

## Why RelayDB Exists

Teams lose time changing `DATABASE_URL`s, rebuilding local databases, sharing fragile dumps, and trying to reproduce someone else's broken database state. RelayDB turns those workflows into a local control plane:

- Create isolated PostgreSQL environments on demand.
- Keep stable local connection strings for applications and developers.
- Route each stable TCP port to the correct database target.
- Group databases, stable routes, and dumps by project workspace.
- Freeze an environment into a reproducible PostgreSQL dump.
- Restore a snapshot into any managed environment in the same project.
- Inspect and mutate environments with a built-in SQL console.
- Automate the same workflows through the CLI.

RelayDB is not a hosted database platform or a general-purpose database admin panel. It is a lightweight local infrastructure layer for development and QA workflows.

## Current Features

### Project Workspaces

Projects group related PostgreSQL environments, stable routes, and snapshots.

```bash
./bin/relaydb projects list
./bin/relaydb projects create "Billing service" --description "Local billing databases"
./bin/relaydb projects use billing-service
```

The app entrypoint is `/app`, which opens the project picker. A selected project opens at `/app/projects/<project-id>`.

### Stable TCP Routes

RelayDB exposes stable local ports. Each stable connection has an owner, a port, and a target environment.

```bash
./bin/relaydb connections create max-local --owner max --port 15432 --target feature-a
./bin/relaydb connections use max-local feature-b
```

Application code keeps the same connection string while RelayDB changes the routed target:

```text
postgresql://postgres:postgres@localhost:15432/app
```

The TCP router watches the shared RelayDB state file and opens listeners for active connection slots.

### Dynamic PostgreSQL Provisioning

RelayDB creates real PostgreSQL environments using Docker:

- one `postgres:16` container per environment;
- one isolated Docker volume per environment;
- all managed environments attached to `relaydb-network`;
- no direct host port exposure for managed PostgreSQL containers;
- routing goes through RelayDB stable TCP ports.

```bash
./bin/relaydb env create feature-a
./bin/relaydb env start feature-a
./bin/relaydb env stop feature-a
./bin/relaydb env delete feature-a
```

### Snapshots

Snapshots are PostgreSQL custom-format dumps created with `pg_dump -Fc`, not Docker filesystem snapshots. Snapshot dump files are stored in the independent `relaydb_snapshots` Docker volume.

```bash
./bin/relaydb snapshots create feature-a before-auth-refactor
./bin/relaydb snapshots restore before-auth-refactor feature-b
./bin/relaydb snapshots download before-auth-refactor --output ./before-auth-refactor.dump
./bin/relaydb snapshots upload feature-a imported-state ./state.dump
```

Deleting an environment does not delete its snapshots.

### SQL Console

RelayDB can execute SQL against a selected managed PostgreSQL container over the internal Docker network.

```bash
./bin/relaydb sql feature-a --query "select current_database(), current_user;"
./bin/relaydb sql feature-a --file ./migration.sql
```

The UI SQL console returns columns, rows, row count, command status, and database errors.

### CLI

The CLI mirrors the control UI and talks to the FastAPI control API. It supports human-readable tables and JSON output.

```bash
./bin/relaydb status
./bin/relaydb --json env list
./bin/relaydb --api-url http://localhost:8000 docs
```

## Architecture

![RelayDB architecture](docs/assets/relaydb-architecture.svg)

```text
Developer App
  -> localhost:<stable-port>
  -> RelayDB TCP Router
  -> active PostgreSQL container
  -> dedicated Docker volume
```

Control plane:

```text
React Frontend / RelayDB CLI
  -> FastAPI API
  -> Docker Engine via Docker SDK for Python
  -> PostgreSQL containers + Docker volumes
```

Snapshot flow:

![RelayDB snapshot workflow](docs/assets/relaydb-snapshots.svg)

```text
PostgreSQL container
  -> pg_dump -Fc
  -> /snapshots/*.dump
  -> pg_restore into target PostgreSQL container
```

## Tech Stack

- Frontend: React, TypeScript, Vite, TailwindCSS, Zustand
- Backend: FastAPI, Python, Docker SDK for Python, psycopg
- CLI: Python stdlib `argparse` + `urllib`
- Data plane: Python `asyncio` TCP router
- Runtime: Docker Compose
- Database engine: PostgreSQL 16 containers

## Quickstart

RelayDB is Docker Compose based.

```bash
docker compose up --build
```

Open:

- Frontend: http://localhost:3001
- Backend API: http://localhost:8000
- OpenAPI docs: http://localhost:8000/docs

Check the running system:

```bash
./bin/relaydb health
./bin/relaydb status
./bin/relaydb docs
```

If your local Python cannot import the backend package directly, run the same CLI inside Compose:

```bash
docker compose run --rm backend python -m app.cli health
docker compose run --rm backend python -m app.cli status
docker compose run --rm backend python -m app.cli docs
```

Use a non-default API host:

```bash
RELAYDB_API_URL=http://localhost:8000 ./bin/relaydb health
./bin/relaydb --api-url http://localhost:8000 env list
```

## First Workflow

Create a project:

```bash
./bin/relaydb projects create "Billing service" --description "Local billing databases"
./bin/relaydb projects use billing-service
```

Create two database environments:

```bash
./bin/relaydb env create feature-a
./bin/relaydb env create qa-clean-room
```

Create a stable route:

```bash
./bin/relaydb connections create max-local --owner max --port 15432 --target feature-a
```

Point your app at:

```text
postgresql://postgres:postgres@localhost:15432/app
```

Switch the same route to another database:

```bash
./bin/relaydb connections use max-local qa-clean-room
```

Create and restore snapshots:

```bash
./bin/relaydb snapshots create qa-clean-room clean-baseline
./bin/relaydb snapshots restore clean-baseline feature-a
```

## CLI Reference

Add `--json` to any command for machine-readable output.

### Runtime

```bash
./bin/relaydb health
./bin/relaydb status
./bin/relaydb docs
./bin/relaydb docs --frontend-url http://localhost:3001
```

### Projects

```bash
./bin/relaydb projects list
./bin/relaydb projects current
./bin/relaydb projects create "Billing service" --description "Local billing databases"
./bin/relaydb projects use billing-service
```

Aliases: `project`.

### Environments

```bash
./bin/relaydb env list
./bin/relaydb env active
./bin/relaydb env create feature-a
./bin/relaydb env create feature-a --project billing-service
./bin/relaydb env use feature-a
./bin/relaydb env start feature-a
./bin/relaydb env stop feature-a
./bin/relaydb env delete feature-a
./bin/relaydb env delete feature-a --keep-volume
```

Aliases: `envs`, `environment`, `environments`.

### Connections

```bash
./bin/relaydb connections list
./bin/relaydb connections create max-local --owner max --port 15432 --target feature-a
./bin/relaydb connections use max-local feature-b
./bin/relaydb connections update max-local --owner backend-team
./bin/relaydb connections update max-local --port 25432 --target feature-a
./bin/relaydb connections delete max-local
```

Aliases: `connection`, `conn`, `conns`.

### SQL

```bash
./bin/relaydb sql feature-a --query "select current_database(), current_user;"
./bin/relaydb sql feature-a --file ./migration.sql
```

### Snapshots

```bash
./bin/relaydb snapshots list
./bin/relaydb snapshots create feature-a before-auth-refactor
./bin/relaydb snapshots restore before-auth-refactor feature-b
./bin/relaydb snapshots download before-auth-refactor --output ./before-auth-refactor.dump
./bin/relaydb snapshots upload feature-a imported-state ./state.dump
./bin/relaydb snapshots delete before-auth-refactor
```

Aliases: `snapshot`, `snap`.

## API Reference

The API is mounted under `/api/v1`.

### Projects

```text
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/active
POST   /api/v1/projects/active/{project_id}
```

Create project:

```json
{
  "name": "Billing service",
  "description": "Local billing databases"
}
```

### Environments

```text
POST   /api/v1/environments
POST   /api/v1/environments/create
GET    /api/v1/environments
GET    /api/v1/environments/active
POST   /api/v1/environments/active/{environment_id}
POST   /api/v1/environments/{environment_id}/start
POST   /api/v1/environments/{environment_id}/stop
DELETE /api/v1/environments/{environment_id}?remove_volume=true
POST   /api/v1/environments/{environment_id}/sql
POST   /api/v1/environments/{environment_id}/snapshots
```

Provision environment:

```json
{
  "name": "feature-a",
  "project_id": "billing-service"
}
```

Execute SQL:

```json
{
  "sql": "select current_database(), current_user;"
}
```

### Connections

```text
GET    /api/v1/connections
POST   /api/v1/connections
GET    /api/v1/connections/{connection_id}
POST   /api/v1/connections/{connection_id}/switch/{environment_id}
PATCH  /api/v1/connections/{connection_id}
DELETE /api/v1/connections/{connection_id}
```

Create stable connection:

```json
{
  "name": "max-local",
  "owner": "max",
  "stable_port": 15432,
  "target_environment_id": "environment-id",
  "project_id": "billing-service"
}
```

### Snapshots

```text
GET    /api/v1/snapshots
POST   /api/v1/snapshots/upload
GET    /api/v1/snapshots/{snapshot_id}/download
POST   /api/v1/snapshots/{snapshot_id}/restore/{environment_id}
DELETE /api/v1/snapshots/{snapshot_id}
```

Create snapshot:

```json
{
  "name": "before-auth-refactor"
}
```

## Docker Compose Services

- `frontend`: React control UI, exposed at `localhost:3001`.
- `backend`: FastAPI control API, exposed at `localhost:8000`.
- `relaydb-router`: raw TCP router that exposes stable route port ranges.
- dynamically provisioned `postgres:16` containers: created at runtime by RelayDB.

The backend mounts `/var/run/docker.sock` so it can provision and manage PostgreSQL containers and volumes.

Published router ranges:

```text
15432-15464
25432-25464
35432-35464
```

Persistent Docker volumes:

- `frontend_node_modules`: frontend dependencies inside Compose.
- `relaydb_state`: shared JSON state for projects, environments, connections, and active targets.
- `relaydb_snapshots`: independent snapshot dump storage.
- generated `relaydb-volume-*` volumes: one per managed PostgreSQL environment.

Shared state path inside containers:

```text
/relaydb-state/environments.json
```

Snapshot storage path inside backend:

```text
/snapshots
```

## Repository Layout

```text
backend/
  app/
    api/v1/              FastAPI routes
    cli.py               RelayDB CLI
    schemas/             Pydantic request/response models
    services/            Docker, registry, SQL, snapshot, project logic
  tests/                 Python unit tests
bin/
  relaydb                Local CLI wrapper
docker/
  backend.Dockerfile
  frontend.Dockerfile
  router.Dockerfile
docs/
  architecture.md
  assets/
frontend/
  src/
    api/                 API client modules
    components/          Shared UI components
    hooks/               Platform orchestration hook
    layouts/             RelayDB app shell
    modules/             Environment UI modules
    pages/               Landing and project picker
    stores/              Zustand stores
router/
  router.py              Multi-port TCP router
```

## Validation

Backend tests:

```bash
docker compose run --rm backend python -m unittest discover -s /app/tests
```

Backend compile check:

```bash
docker compose run --rm backend python -m compileall /app
```

Frontend typecheck:

```bash
cd frontend
npx tsc -b
```

Frontend build without touching a host-owned `dist` directory:

```bash
cd frontend
npx vite build --outDir /tmp/nexusops-relaydb-dist --emptyOutDir
```

## Troubleshooting

### `npm run build` fails with `EACCES` under `frontend/dist`

Some generated files may be owned by a container user. Validate with a temporary output directory instead:

```bash
cd frontend
npx tsc -b
npx vite build --outDir /tmp/nexusops-relaydb-dist --emptyOutDir
```

### CLI cannot reach the API

Confirm the backend is running:

```bash
docker compose ps
./bin/relaydb health
```

Use an explicit API URL if needed:

```bash
./bin/relaydb --api-url http://localhost:8000 health
```

### Stable port already in use

Stable connection ports must be unique. List existing assignments:

```bash
./bin/relaydb connections list
```

Then choose another port or update the existing route:

```bash
./bin/relaydb connections update max-local --port 25432
```

### Environment is not reachable from SQL console

The managed PostgreSQL container must be running:

```bash
./bin/relaydb env list
./bin/relaydb env start feature-a
```

## Current Scope

Implemented:

- project workspaces;
- Docker-based PostgreSQL provisioning;
- isolated Docker volumes;
- stable TCP routes;
- active environment switching;
- SQL console;
- snapshot create/upload/download/restore/delete;
- CLI control plane;
- FastAPI API;
- React control UI;
- Docker Compose runtime.

Not implemented yet:

- authentication and user permissions;
- hosted/cloud database management;
- team membership or role-based access;
- persistent control-plane database beyond the shared JSON state file;
- automatic migrations across managed environments;
- background scheduling.
