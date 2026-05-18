import asyncio
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

STATE_PATH = Path(os.getenv("SWITCHBASE_STATE_PATH", "/switchbase-state/environments.json"))
LISTEN_HOST = os.getenv("SWITCHBASE_ROUTER_HOST", "0.0.0.0")
LISTEN_PORT = int(os.getenv("SWITCHBASE_ROUTER_PORT", "5432"))
STATE_POLL_INTERVAL_SECONDS = float(os.getenv("SWITCHBASE_STATE_POLL_INTERVAL_SECONDS", "0.5"))


@dataclass(eq=False)
class ActiveConnection:
    client_writer: asyncio.StreamWriter
    target_writer: asyncio.StreamWriter


active_connections: set[ActiveConnection] = set()
active_connections_lock = asyncio.Lock()


def load_state() -> dict[str, Any]:
    with STATE_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def load_active_target() -> dict[str, Any]:
    """Read the current active environment for a new incoming connection.

    Switchbase intentionally does not parse PostgreSQL protocol in this MVP.
    It opens a raw TCP connection to the selected target and pipes bytes in
    both directions until either side closes.
    """

    state = load_state()
    active_id = state.get("active_environment_id")
    for environment in state.get("environments", []):
        if environment["id"] == active_id:
            return environment

    raise RuntimeError("No active PostgreSQL environment configured")


def load_active_environment_id() -> str | None:
    return load_state().get("active_environment_id")


async def close_writer(writer: asyncio.StreamWriter) -> None:
    writer.close()
    try:
        await writer.wait_closed()
    except Exception:
        pass


async def register_connection(connection: ActiveConnection) -> None:
    async with active_connections_lock:
        active_connections.add(connection)


async def unregister_connection(connection: ActiveConnection) -> None:
    async with active_connections_lock:
        active_connections.discard(connection)


async def close_active_connections(reason: str) -> None:
    async with active_connections_lock:
        connections = list(active_connections)
        active_connections.clear()

    if not connections:
        return

    print(f"Closing {len(connections)} active connection(s): {reason}", flush=True)
    await asyncio.gather(
        *[
            close_writer(writer)
            for connection in connections
            for writer in (connection.client_writer, connection.target_writer)
        ],
        return_exceptions=True,
    )


async def watch_active_environment() -> None:
    last_active_id: str | None = None

    while True:
        try:
            active_id = load_active_environment_id()
        except Exception as exc:
            print(f"Unable to read active environment state: {exc}", flush=True)
            await asyncio.sleep(STATE_POLL_INTERVAL_SECONDS)
            continue

        if last_active_id is None:
            last_active_id = active_id
        elif active_id != last_active_id:
            previous_active_id = last_active_id
            last_active_id = active_id
            await close_active_connections(
                f"active environment changed from {previous_active_id} to {active_id}"
            )

        await asyncio.sleep(STATE_POLL_INTERVAL_SECONDS)


async def pipe(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
    try:
        while not reader.at_eof():
            chunk = await reader.read(65536)
            if not chunk:
                break
            writer.write(chunk)
            await writer.drain()
    finally:
        writer.close()
        await writer.wait_closed()


async def handle_client(client_reader: asyncio.StreamReader, client_writer: asyncio.StreamWriter) -> None:
    try:
        target = load_active_target()
        target_reader, target_writer = await asyncio.open_connection(target["host"], int(target["port"]))
    except Exception:
        await close_writer(client_writer)
        return

    connection = ActiveConnection(client_writer=client_writer, target_writer=target_writer)
    await register_connection(connection)

    try:
        await asyncio.gather(
            pipe(client_reader, target_writer),
            pipe(target_reader, client_writer),
            return_exceptions=True,
        )
    finally:
        await unregister_connection(connection)


async def main() -> None:
    server = await asyncio.start_server(handle_client, LISTEN_HOST, LISTEN_PORT)
    sockets = ", ".join(str(sock.getsockname()) for sock in server.sockets or [])
    print(f"Switchbase TCP router listening on {sockets}", flush=True)

    watcher_task = asyncio.create_task(watch_active_environment())
    async with server:
        try:
            await server.serve_forever()
        finally:
            watcher_task.cancel()
            await close_active_connections("router shutting down")


if __name__ == "__main__":
    asyncio.run(main())
