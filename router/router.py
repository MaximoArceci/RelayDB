import asyncio
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

STATE_PATH = Path(os.getenv("RELAYDB_STATE_PATH", "/relaydb-state/environments.json"))
LISTEN_HOST = os.getenv("RELAYDB_ROUTER_HOST", "0.0.0.0")
STATE_POLL_INTERVAL_SECONDS = float(os.getenv("RELAYDB_STATE_POLL_INTERVAL_SECONDS", "0.5"))


@dataclass(frozen=True)
class ListenerConfig:
    connection_id: str
    stable_port: int


@dataclass
class ListenerRuntime:
    config: ListenerConfig
    server: asyncio.AbstractServer


listeners: dict[int, ListenerRuntime] = {}


def load_state() -> dict[str, Any]:
    with STATE_PATH.open("r", encoding="utf-8") as file:
        state = json.load(file)
    state.setdefault("environments", [])
    state.setdefault("connections", [])
    return state


def find_environment(state: dict[str, Any], environment_id: str) -> dict[str, Any]:
    for environment in state.get("environments", []):
        if environment["id"] == environment_id:
            return environment
    raise RuntimeError(f"Target environment {environment_id} is not registered")


def load_connection_target(connection_id: str) -> dict[str, Any]:
    state = load_state()
    for connection in state.get("connections", []):
        if connection["id"] == connection_id:
            if connection.get("status") != "active":
                raise RuntimeError(f"Connection {connection_id} is not active")
            return find_environment(state, connection["target_environment_id"])
    raise RuntimeError(f"Connection {connection_id} is not registered")


async def close_writer(writer: asyncio.StreamWriter) -> None:
    writer.close()
    try:
        await writer.wait_closed()
    except Exception:
        pass


async def pipe(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
    try:
        while not reader.at_eof():
            chunk = await reader.read(65536)
            if not chunk:
                break
            writer.write(chunk)
            await writer.drain()
    finally:
        await close_writer(writer)


async def handle_client(
    connection_id: str,
    client_reader: asyncio.StreamReader,
    client_writer: asyncio.StreamWriter,
) -> None:
    try:
        target = load_connection_target(connection_id)
        target_reader, target_writer = await asyncio.open_connection(target["host"], int(target["port"]))
    except Exception as exc:
        print(f"Unable to route connection {connection_id}: {exc}", flush=True)
        await close_writer(client_writer)
        return

    try:
        await asyncio.gather(
            pipe(client_reader, target_writer),
            pipe(target_reader, client_writer),
            return_exceptions=True,
        )
    finally:
        await close_writer(client_writer)
        await close_writer(target_writer)


async def start_listener(config: ListenerConfig) -> None:
    server = await asyncio.start_server(
        lambda reader, writer: handle_client(config.connection_id, reader, writer),
        LISTEN_HOST,
        config.stable_port,
    )
    listeners[config.stable_port] = ListenerRuntime(config=config, server=server)
    sockets = ", ".join(str(sock.getsockname()) for sock in server.sockets or [])
    print(f"RelayDB connection {config.connection_id} listening on {sockets}", flush=True)


async def stop_listener(port: int, reason: str) -> None:
    runtime = listeners.pop(port, None)
    if runtime is None:
        return

    print(f"Stopping RelayDB listener on {port}: {reason}", flush=True)
    runtime.server.close()
    await runtime.server.wait_closed()


def desired_listener_configs(state: dict[str, Any]) -> dict[int, ListenerConfig]:
    configs: dict[int, ListenerConfig] = {}
    for connection in state.get("connections", []):
        if connection.get("status") != "active":
            continue
        configs[int(connection["stable_port"])] = ListenerConfig(
            connection_id=connection["id"],
            stable_port=int(connection["stable_port"]),
        )
    return configs


async def reconcile_listeners() -> None:
    try:
        desired = desired_listener_configs(load_state())
    except Exception as exc:
        print(f"Unable to read RelayDB routing state: {exc}", flush=True)
        return

    for port, runtime in list(listeners.items()):
        next_config = desired.get(port)
        if next_config is None:
            await stop_listener(port, "connection slot removed or inactive")
        elif next_config != runtime.config:
            await stop_listener(port, "connection slot changed")

    for port, config in desired.items():
        if port not in listeners:
            try:
                await start_listener(config)
            except Exception as exc:
                print(f"Unable to start listener for {config.connection_id} on {port}: {exc}", flush=True)


async def main() -> None:
    print("RelayDB multi-port TCP router starting", flush=True)
    while True:
        await reconcile_listeners()
        await asyncio.sleep(STATE_POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    finally:
        for runtime in listeners.values():
            runtime.server.close()
