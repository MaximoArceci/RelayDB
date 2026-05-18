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
POST /api/v1/environments
POST /api/v1/environments/create
GET  /api/v1/environments
POST /api/v1/environments/active/{id}
GET  /api/v1/environments/active
POST /api/v1/environments/{id}/sql
POST /api/v1/environments/{id}/start
POST /api/v1/environments/{id}/stop
DELETE /api/v1/environments/{id}
```

Example SQL execution body:

```json
{
  "sql": "select current_database(), current_user;"
}
```

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

No authentication, Kafka, snapshots, cloning, RBAC, Kubernetes, or AI are implemented in this MVP.
