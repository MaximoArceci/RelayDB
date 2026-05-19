# RelayDB

RelayDB is a local developer infrastructure tool for teams that need reproducible PostgreSQL environments.

It gives every developer app one stable database endpoint:

```text
postgresql://postgres:postgres@localhost:5432/app
```

Behind that endpoint, RelayDB can provision isolated PostgreSQL containers, switch the active database target, freeze database states as snapshots, restore those snapshots into any managed environment, and run SQL directly from the control UI.

![RelayDB dashboard](docs/assets/relaydb-dashboard.png)

## Why RelayDB Exists

Teams often lose time changing `DATABASE_URL`s, manually rebuilding local databases, sharing fragile SQL dumps, or trying to reproduce a teammate's broken state. RelayDB turns those workflows into a local control plane:

- Create isolated PostgreSQL environments on demand.
- Keep one stable connection string for your app.
- Switch which database receives traffic without changing app config.
- Freeze an environment into a reproducible snapshot.
- Restore any snapshot into any managed database.
- Inspect and mutate environments with a built-in SQL console.

RelayDB is not a database admin panel or a cloud database platform. It is a lightweight local infrastructure layer for development teams.

## Current Features

### Stable Local Endpoint

Developer applications always connect to:

```text
postgresql://postgres:postgres@localhost:5432/app
```

The RelayDB TCP router listens on `localhost:5432` and forwards new PostgreSQL connections to the currently active environment.

### Dynamic PostgreSQL Provisioning

RelayDB creates real PostgreSQL environments using Docker:

- one `postgres:16` container per environment
- one isolated Docker volume per environment
- all environments attached to `relaydb-network`
- no direct host port exposure for managed Postgres containers

The router is the only stable database entrypoint.

### Environment Lifecycle

From the UI or API, environments can be:

- created
- started
- stopped
- deleted
- selected as the active route target

When the active target changes, RelayDB closes existing router connections so clients reconnect into the new database.

### Snapshots

Snapshots represent reproducible frozen development states.

RelayDB snapshots are PostgreSQL dumps created with `pg_dump`, not Docker filesystem snapshots. Snapshot files are stored in an independent Docker volume:

```text
relaydb_snapshots -> /snapshots
```

That means deleting a database environment does not delete its snapshots.

Snapshots can be:

- created from any managed environment
- listed globally
- restored into any managed environment, not only the source database
- deleted independently

Restore uses `pg_restore` and replaces the target database state.

### SQL Console

The active environment view includes a SQL console. It executes SQL against the selected managed PostgreSQL container over the internal Docker network and returns:

- columns
- rows
- row count
- command status
- database errors

This is useful for quick inspection, setup, and debugging without leaving the RelayDB UI.

![RelayDB SQL console and snapshots](docs/assets/relaydb-sql-console.png)

## Architecture

![RelayDB architecture](docs/assets/relaydb-architecture.svg)

```text
Developer App
  -> localhost:5432
  -> RelayDB TCP Router
  -> active PostgreSQL container
  -> dedicated Docker volume
```

Control plane:

```text
Frontend
  -> FastAPI API
  -> Docker Engine via Docker SDK for Python
  -> PostgreSQL containers + Docker volumes
```

Snapshot flow:

![RelayDB snapshot workflow](docs/assets/relaydb-snapshots.svg)

```text
PostgreSQL container
  -> pg_dump
  -> /snapshots/*.dump
  -> pg_restore into any target PostgreSQL container
```

## Tech Stack

- Frontend: React, TypeScript, Vite, TailwindCSS, Zustand
- Backend: FastAPI, Python, Docker SDK for Python, psycopg
- Data plane: Python asyncio TCP router
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

If your machine already uses port `5432`, start RelayDB with another public router port:

```bash
RELAYDB_ROUTER_PUBLIC_PORT=15432 docker compose up --build
```

Then connect your app to:

```text
postgresql://postgres:postgres@localhost:15432/app
```

## Typical Team Workflows

### Reproduce a Teammate's Bug

1. A teammate creates a snapshot named `checkout-race-condition`.
2. You create or select your own environment.
3. You restore `checkout-race-condition` into your environment.
4. Your app keeps the same connection string.
5. You reproduce and debug the exact database state.

### Test a Migration Safely

1. Create a snapshot called `before-auth-migration`.
2. Run the migration using the SQL console or your app.
3. If the state is wrong, restore the snapshot.
4. Repeat without rebuilding the environment manually.

### Switch Between Workstreams

1. Create `feature-a`, `feature-b`, and `qa-debug` environments.
2. Keep your app pointed at `localhost:5432`.
3. Switch the active RelayDB target from the UI.
4. Your app reconnects to the selected database.

## API Overview

### Environments

```text
POST   /api/v1/environments/create
GET    /api/v1/environments
GET    /api/v1/environments/active
POST   /api/v1/environments/active/{id}
POST   /api/v1/environments/{id}/start
POST   /api/v1/environments/{id}/stop
DELETE /api/v1/environments/{id}
```

Create environment:

```json
{
  "name": "Pedro Debug DB"
}
```

### SQL Execution

```text
POST /api/v1/environments/{id}/sql
```

Request:

```json
{
  "sql": "select current_database(), current_user;"
}
```

### Snapshots

```text
POST   /api/v1/environments/{id}/snapshots
GET    /api/v1/snapshots
POST   /api/v1/snapshots/{id}/restore/{environment_id}
DELETE /api/v1/snapshots/{id}
```

Create snapshot:

```json
{
  "name": "before-auth-refactor"
}
```

## Docker Compose Services

- `frontend`: React control UI.
- `backend`: FastAPI control API. It mounts `/var/run/docker.sock` to provision containers and volumes.
- `relaydb-router`: raw TCP router exposed as the stable PostgreSQL endpoint.
- dynamically provisioned `postgres:16` containers: created at runtime by RelayDB.

Persistent Docker volumes:

- `relaydb_state`: shared JSON state for environments, active target, and snapshot metadata.
- `relaydb_snapshots`: independent snapshot dump storage.
- one generated Docker volume per managed PostgreSQL environment.

## Current Scope

RelayDB currently focuses on local PostgreSQL development environments.

Implemented:

- Docker-based PostgreSQL provisioning
- isolated Docker volumes
- active environment switching
- stable local database endpoint
- TCP routing
- SQL console
- snapshot creation with `pg_dump`
- snapshot restore with `pg_restore`
- global snapshot listing and deletion

Not implemented yet:

- authentication
- RBAC
- cloud storage
- S3
- Kubernetes
- branching databases
- differential snapshots
- realtime replication
- SQL protocol parsing
- managed production database hosting

## Development Notes

The backend must be able to access the Docker daemon:

```text
/var/run/docker.sock
```

Managed PostgreSQL containers should not expose ports directly to the host. If a feature needs database access, prefer one of these paths:

- through the RelayDB TCP router for app traffic
- through the backend over `relaydb-network` for control-plane operations

Snapshots must stay outside individual PostgreSQL volumes. They belong in `/snapshots`, backed by `relaydb_snapshots`, so frozen states survive environment deletion.
