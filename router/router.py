import asyncio
import json
import os
from pathlib import Path
from typing import Any

STATE_PATH = Path(os.getenv("SWITCHBASE_STATE_PATH", "/switchbase-state/environments.json"))
LISTEN_HOST = os.getenv("SWITCHBASE_ROUTER_HOST", "0.0.0.0")
LISTEN_PORT = int(os.getenv("SWITCHBASE_ROUTER_PORT", "5432"))


def load_active_target() -> dict[str, Any]:
    """Read the current active environment for a new incoming connection.

    Switchbase intentionally does not parse PostgreSQL protocol in this MVP.
    It opens a raw TCP connection to the selected target and pipes bytes in
    both directions until either side closes.
    """

    with STATE_PATH.open("r", encoding="utf-8") as file:
        state = json.load(file)

    active_id = state.get("active_environment_id")
    for environment in state.get("environments", []):
        if environment["id"] == active_id:
            return environment

    raise RuntimeError("No active PostgreSQL environment configured")


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
        client_writer.close()
        await client_writer.wait_closed()
        return

    await asyncio.gather(
        pipe(client_reader, target_writer),
        pipe(target_reader, client_writer),
        return_exceptions=True,
    )


async def main() -> None:
    server = await asyncio.start_server(handle_client, LISTEN_HOST, LISTEN_PORT)
    sockets = ", ".join(str(sock.getsockname()) for sock in server.sockets or [])
    print(f"Switchbase TCP router listening on {sockets}", flush=True)

    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())
