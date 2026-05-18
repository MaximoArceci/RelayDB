# RelayDB

RelayDB is a minimal developer infrastructure MVP that proves one core idea:

> A developer app connects to one stable local PostgreSQL endpoint while RelayDB forwards traffic to the currently active PostgreSQL target.

The stable endpoint is:

```text
localhost:5432
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
GET  /api/v1/environments
POST /api/v1/environments/active/{id}
GET  /api/v1/environments/active
```

Example registration body:

```json
{
  "name": "Pedro Debug DB",
  "host": "postgres-pedro",
  "port": 5432,
  "database": "app",
  "username": "postgres",
  "password": "postgres"
}
```

## Compose Services

- `frontend`: React control UI
- `backend`: FastAPI control API
- `relaydb-router`: raw TCP router listening on the stable endpoint
- `postgres-dev`: example manually managed PostgreSQL target
- `postgres-qa`: example manually managed PostgreSQL target

No authentication, Kafka, snapshots, orchestration, cloning, RBAC, Kubernetes, or AI are implemented in this MVP.
