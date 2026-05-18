# RelayDB Architecture

RelayDB is currently an ultra-focused local PostgreSQL provisioning and routing MVP.

```text
Frontend
  -> FastAPI Control API
  -> Docker Engine
  -> PostgreSQL Containers + Docker Volumes
  -> shared active-target state
  -> RelayDB TCP Router
  -> selected PostgreSQL container
```

## Control Plane

The FastAPI backend provisions PostgreSQL environments with Docker SDK for
Python. A managed environment contains one `postgres:16` container and one
dedicated Docker volume mounted at `/var/lib/postgresql/data`.

The backend also sets the active target. Runtime metadata is stored in a shared
JSON file mounted into the backend and router containers. This keeps the MVP
simple while allowing the router to run as a separate process.

All managed PostgreSQL containers join the Docker network named
`relaydb-network`. They are not exposed directly to the host machine.

RelayDB-provisioned containers use the same database contract so developer
applications can keep one stable `DATABASE_URL` across environment switches:
`postgresql://postgres:postgres@localhost:5432/app`.

## Data Plane

The router is a lightweight asyncio TCP forwarder. It listens on one stable port
and, for each new incoming connection, reads the active target from shared state.
It then opens a TCP connection to that PostgreSQL container and pipes raw bytes
in both directions.

The router does not parse SQL or PostgreSQL protocol messages.

SQL execution from the control plane is separate from the TCP router. The API
connects directly to the selected environment over `relaydb-network` with
`psycopg` and returns columns, rows, row count, and command status to the UI.

## Current Limits

- Active target changes close existing router connections so clients reconnect to the new target.
- Environment metadata is in shared file state, not durable application storage.
- PostgreSQL readiness is currently Docker-container lifecycle level, not a deep SQL health check.
- Snapshots, cloning, Kubernetes, auth, RBAC, and SQL parsing are intentionally out of scope.
