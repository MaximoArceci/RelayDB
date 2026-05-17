# Switchbase Architecture

Switchbase is currently an ultra-focused routing MVP.

```text
Frontend
  -> FastAPI Control API
  -> shared active-target state
  -> Switchbase TCP Router
  -> selected PostgreSQL instance
```

## Control Plane

The FastAPI backend registers PostgreSQL targets and sets the active target.
State is stored in a shared JSON file mounted into the backend and router
containers. This keeps the MVP simple while allowing the router to run as a
separate process.

## Data Plane

The router is a lightweight asyncio TCP forwarder. It listens on one stable port
and, for each new incoming connection, reads the active target from shared state.
It then opens a TCP connection to that PostgreSQL host and pipes raw bytes in
both directions.

The router does not parse SQL or PostgreSQL protocol messages.

## Current Limits

- Active target changes affect new TCP connections.
- Existing open TCP connections continue until closed.
- Registered targets are in shared file state, not durable application storage.
- PostgreSQL target containers are examples only; Switchbase does not create or manage environments yet.
