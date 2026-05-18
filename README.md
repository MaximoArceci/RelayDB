# RelayDB

RelayDB is a minimal developer infrastructure MVP that proves one core idea:

> A developer app connects to one stable local PostgreSQL endpoint while RelayDB forwards traffic to the currently active PostgreSQL target.

RelayDB can now provision isolated PostgreSQL environments locally. Each managed environment gets its own Docker container and Docker volume, attached to the internal `relaydb-network`.

The stable endpoint is:

```text
localhost:5432
```

The stable connection contract for RelayDB-provisioned environments is:

```text
postgresql://postgres:postgres@localhost:5432/app
```

## Run

This project is Docker Compose only.

```bash
docker compose up --build
```

Frontend: http://localhost:3001  
Backend: http://localhost:8000  
API docs: http://localhost:8000/docs

If your machine already has PostgreSQL on `5432`, run:

```bash
RELAYDB_ROUTER_PUBLIC_PORT=15432 docker compose up --build
```

## API

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
POST /api/v1/auth/logout
POST /api/v1/environments
POST /api/v1/environments/create
GET  /api/v1/environments
POST /api/v1/environments/active/{id}
GET  /api/v1/environments/active
POST /api/v1/environments/{id}/start
POST /api/v1/environments/{id}/stop
DELETE /api/v1/environments/{id}
```

Environment APIs require `Authorization: Bearer <token>`. Authorization is intentionally simple for now: every authenticated user can access every environment.

Example provisioning body:

```json
{
  "name": "Pedro Debug DB"
}
```

## Compose Services

- `frontend`: React control UI
- `backend`: FastAPI control API
- `relaydb-router`: raw TCP router listening on the stable endpoint
- dynamically provisioned `postgres:16` containers: managed at runtime by the backend through Docker SDK for Python

The backend mounts `/var/run/docker.sock` so it can create Docker volumes, containers, and attach environments to `relaydb-network`. Managed PostgreSQL containers are not exposed to the host; the router remains the stable entrypoint.

User auth is stored in SQLite at `/relaydb-state/relaydb.db`. The current schema creates a `users` table and a `sessions` table.

No RBAC, Kafka, snapshots, cloning, Kubernetes, or AI are implemented in this MVP.
