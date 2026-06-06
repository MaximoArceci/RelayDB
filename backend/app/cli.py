from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

DEFAULT_API_URL = "http://localhost:8000"


class CliError(Exception):
    pass


class RelayDBClient:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    def request(
        self,
        method: str,
        path: str,
        *,
        payload: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
        data: bytes | None = None,
    ) -> Any:
        request_headers = {"Accept": "application/json"}
        if headers:
            request_headers.update(headers)

        body = data
        if payload is not None:
            body = json.dumps(payload).encode("utf-8")
            request_headers["Content-Type"] = "application/json"

        request = urllib.request.Request(
            f"{self.base_url}{path}",
            data=body,
            headers=request_headers,
            method=method,
        )

        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                content_type = response.headers.get("Content-Type", "")
                content = response.read()
                if "application/json" in content_type:
                    return json.loads(content.decode("utf-8"))
                return content
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            try:
                parsed = json.loads(detail)
                message = parsed.get("detail") or detail
            except json.JSONDecodeError:
                message = detail or exc.reason
            raise CliError(f"{exc.code}: {message}") from exc
        except urllib.error.URLError as exc:
            raise CliError(f"Unable to reach RelayDB API at {self.base_url}: {exc.reason}") from exc

    def get(self, path: str) -> Any:
        return self.request("GET", path)

    def post(self, path: str, payload: dict[str, Any] | None = None) -> Any:
        return self.request("POST", path, payload=payload)

    def patch(self, path: str, payload: dict[str, Any]) -> Any:
        return self.request("PATCH", path, payload=payload)

    def delete(self, path: str) -> Any:
        return self.request("DELETE", path)

    def upload_snapshot(self, environment_id: str, name: str, file_path: Path) -> Any:
        boundary = "relaydb-cli-boundary"
        file_bytes = file_path.read_bytes()
        parts = [
            form_field(boundary, "environment_id", environment_id),
            form_field(boundary, "name", name),
            file_field(boundary, "file", file_path.name, file_bytes),
            f"--{boundary}--\r\n".encode("utf-8"),
        ]
        return self.request(
            "POST",
            "/api/v1/snapshots/upload",
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
            data=b"".join(parts),
        )


def form_field(boundary: str, name: str, value: str) -> bytes:
    return (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="{name}"\r\n\r\n'
        f"{value}\r\n"
    ).encode("utf-8")


def file_field(boundary: str, name: str, filename: str, content: bytes) -> bytes:
    header = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'
        "Content-Type: application/octet-stream\r\n\r\n"
    ).encode("utf-8")
    return header + content + b"\r\n"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="relaydb", description="RelayDB command line control plane.")
    parser.add_argument("--api-url", default=os.getenv("RELAYDB_API_URL", DEFAULT_API_URL), help="RelayDB API URL.")
    parser.add_argument("--json", action="store_true", help="Print raw JSON output.")

    subparsers = parser.add_subparsers(dest="resource", required=True)

    subparsers.add_parser("health", help="Check API health.").set_defaults(handler=health)
    subparsers.add_parser("status", help="Show RelayDB operational status.").set_defaults(handler=status)

    docs = subparsers.add_parser("docs", aliases=["documentation", "doc"], help="Show RelayDB documentation and runtime URLs.")
    docs.add_argument("--frontend-url", default=os.getenv("RELAYDB_FRONTEND_URL", "http://localhost:3001"))
    docs.set_defaults(handler=docs_urls)

    projects = subparsers.add_parser("projects", aliases=["project"], help="Manage project workspaces.")
    project_sub = projects.add_subparsers(dest="action", required=True)
    project_sub.add_parser("list", aliases=["ls"]).set_defaults(handler=list_projects)
    project_sub.add_parser("current").set_defaults(handler=current_project)
    create_project_parser = project_sub.add_parser("create")
    create_project_parser.add_argument("name")
    create_project_parser.add_argument("--description", default="")
    create_project_parser.set_defaults(handler=create_project)
    use_project_parser = project_sub.add_parser("use")
    use_project_parser.add_argument("project")
    use_project_parser.set_defaults(handler=use_project)

    envs = subparsers.add_parser("env", aliases=["envs", "environment", "environments"], help="Manage PostgreSQL environments.")
    env_sub = envs.add_subparsers(dest="action", required=True)
    env_sub.add_parser("list", aliases=["ls"]).set_defaults(handler=list_environments)
    env_sub.add_parser("active").set_defaults(handler=active_environment)
    create_env_parser = env_sub.add_parser("create")
    create_env_parser.add_argument("name")
    create_env_parser.add_argument("--project")
    create_env_parser.set_defaults(handler=create_environment)
    for action, handler in (("use", use_environment), ("start", start_environment), ("stop", stop_environment)):
        action_parser = env_sub.add_parser(action)
        action_parser.add_argument("environment")
        action_parser.set_defaults(handler=handler)
    delete_env_parser = env_sub.add_parser("delete", aliases=["rm"])
    delete_env_parser.add_argument("environment")
    delete_env_parser.add_argument("--keep-volume", action="store_true")
    delete_env_parser.set_defaults(handler=delete_environment)

    connections = subparsers.add_parser("connections", aliases=["connection", "conn", "conns"], help="Manage stable TCP routes.")
    conn_sub = connections.add_subparsers(dest="action", required=True)
    conn_sub.add_parser("list", aliases=["ls"]).set_defaults(handler=list_connections)
    create_conn_parser = conn_sub.add_parser("create")
    create_conn_parser.add_argument("name")
    create_conn_parser.add_argument("--owner", required=True)
    create_conn_parser.add_argument("--port", type=int, required=True)
    create_conn_parser.add_argument("--target", required=True)
    create_conn_parser.add_argument("--project")
    create_conn_parser.set_defaults(handler=create_connection)
    use_conn_parser = conn_sub.add_parser("use")
    use_conn_parser.add_argument("connection")
    use_conn_parser.add_argument("environment")
    use_conn_parser.set_defaults(handler=use_connection)
    update_conn_parser = conn_sub.add_parser("update")
    update_conn_parser.add_argument("connection")
    update_conn_parser.add_argument("--name")
    update_conn_parser.add_argument("--owner")
    update_conn_parser.add_argument("--port", type=int)
    update_conn_parser.add_argument("--target")
    update_conn_parser.set_defaults(handler=update_connection)
    delete_conn_parser = conn_sub.add_parser("delete", aliases=["rm"])
    delete_conn_parser.add_argument("connection")
    delete_conn_parser.set_defaults(handler=delete_connection)

    snapshots = subparsers.add_parser("snapshots", aliases=["snapshot", "snap"], help="Manage PostgreSQL snapshots.")
    snap_sub = snapshots.add_subparsers(dest="action", required=True)
    snap_sub.add_parser("list", aliases=["ls"]).set_defaults(handler=list_snapshots)
    create_snap_parser = snap_sub.add_parser("create")
    create_snap_parser.add_argument("environment")
    create_snap_parser.add_argument("name")
    create_snap_parser.set_defaults(handler=create_snapshot)
    restore_snap_parser = snap_sub.add_parser("restore")
    restore_snap_parser.add_argument("snapshot")
    restore_snap_parser.add_argument("environment")
    restore_snap_parser.set_defaults(handler=restore_snapshot)
    download_snap_parser = snap_sub.add_parser("download")
    download_snap_parser.add_argument("snapshot")
    download_snap_parser.add_argument("--output", "-o")
    download_snap_parser.set_defaults(handler=download_snapshot)
    upload_snap_parser = snap_sub.add_parser("upload")
    upload_snap_parser.add_argument("environment")
    upload_snap_parser.add_argument("name")
    upload_snap_parser.add_argument("file")
    upload_snap_parser.set_defaults(handler=upload_snapshot)
    delete_snap_parser = snap_sub.add_parser("delete", aliases=["rm"])
    delete_snap_parser.add_argument("snapshot")
    delete_snap_parser.set_defaults(handler=delete_snapshot)

    sql_parser = subparsers.add_parser("sql", help="Execute SQL against an environment.")
    sql_parser.add_argument("environment")
    sql_source = sql_parser.add_mutually_exclusive_group(required=True)
    sql_source.add_argument("--query", "-q")
    sql_source.add_argument("--file", "-f")
    sql_parser.set_defaults(handler=run_sql)

    return parser


def health(client: RelayDBClient, args: argparse.Namespace) -> Any:
    return client.get("/health")


def status(client: RelayDBClient, args: argparse.Namespace) -> Any:
    health_data = client.get("/health")
    projects = client.get("/api/v1/projects")
    active_project = client.get("/api/v1/projects/active")
    environments = client.get("/api/v1/environments")
    active_environment = client.get("/api/v1/environments/active")
    connections = client.get("/api/v1/connections")
    snapshots = client.get("/api/v1/snapshots")
    return {
        "health": health_data,
        "active_project": active_project.get("project"),
        "project_count": len(projects.get("projects", [])),
        "active_environment": active_environment.get("environment"),
        "environment_count": len(environments.get("environments", [])),
        "connection_count": len(connections.get("connections", [])),
        "snapshot_count": len(snapshots.get("snapshots", [])),
    }


def docs_urls(client: RelayDBClient, args: argparse.Namespace) -> Any:
    api_url = client.base_url
    return {
        "frontend": args.frontend_url,
        "backend_api": api_url,
        "openapi_docs": f"{api_url}/docs",
        "openapi_json": f"{api_url}/openapi.json",
        "health": f"{api_url}/health",
        "readme": "README.md",
    }


def list_projects(client: RelayDBClient, args: argparse.Namespace) -> Any:
    return client.get("/api/v1/projects")


def current_project(client: RelayDBClient, args: argparse.Namespace) -> Any:
    return client.get("/api/v1/projects/active")


def create_project(client: RelayDBClient, args: argparse.Namespace) -> Any:
    return client.post("/api/v1/projects", {"name": args.name, "description": args.description})


def use_project(client: RelayDBClient, args: argparse.Namespace) -> Any:
    project = resolve_project(client, args.project)
    return client.post(f"/api/v1/projects/active/{quote(project['id'])}")


def list_environments(client: RelayDBClient, args: argparse.Namespace) -> Any:
    return client.get("/api/v1/environments")


def active_environment(client: RelayDBClient, args: argparse.Namespace) -> Any:
    return client.get("/api/v1/environments/active")


def create_environment(client: RelayDBClient, args: argparse.Namespace) -> Any:
    project_id = args.project or client.get("/api/v1/projects")["active_project_id"]
    return client.post("/api/v1/environments/create", {"name": args.name, "project_id": project_id})


def use_environment(client: RelayDBClient, args: argparse.Namespace) -> Any:
    environment = resolve_environment(client, args.environment)
    return client.post(f"/api/v1/environments/active/{quote(environment['id'])}")


def start_environment(client: RelayDBClient, args: argparse.Namespace) -> Any:
    environment = resolve_environment(client, args.environment)
    return client.post(f"/api/v1/environments/{quote(environment['id'])}/start")


def stop_environment(client: RelayDBClient, args: argparse.Namespace) -> Any:
    environment = resolve_environment(client, args.environment)
    return client.post(f"/api/v1/environments/{quote(environment['id'])}/stop")


def delete_environment(client: RelayDBClient, args: argparse.Namespace) -> Any:
    environment = resolve_environment(client, args.environment)
    remove_volume = "false" if args.keep_volume else "true"
    return client.delete(f"/api/v1/environments/{quote(environment['id'])}?remove_volume={remove_volume}")


def list_connections(client: RelayDBClient, args: argparse.Namespace) -> Any:
    return client.get("/api/v1/connections")


def create_connection(client: RelayDBClient, args: argparse.Namespace) -> Any:
    environment = resolve_environment(client, args.target)
    project_id = args.project or environment["project_id"]
    return client.post(
        "/api/v1/connections",
        {
            "name": args.name,
            "owner": args.owner,
            "stable_port": args.port,
            "target_environment_id": environment["id"],
            "project_id": project_id,
        },
    )


def use_connection(client: RelayDBClient, args: argparse.Namespace) -> Any:
    connection = resolve_connection(client, args.connection)
    environment = resolve_environment(client, args.environment)
    return client.post(f"/api/v1/connections/{quote(connection['id'])}/switch/{quote(environment['id'])}")


def update_connection(client: RelayDBClient, args: argparse.Namespace) -> Any:
    connection = resolve_connection(client, args.connection)
    payload: dict[str, Any] = {}
    if args.name:
        payload["name"] = args.name
    if args.owner:
        payload["owner"] = args.owner
    if args.port:
        payload["stable_port"] = args.port
    if args.target:
        payload["target_environment_id"] = resolve_environment(client, args.target)["id"]
    if not payload:
        raise CliError("No connection updates were provided.")
    return client.patch(f"/api/v1/connections/{quote(connection['id'])}", payload)


def delete_connection(client: RelayDBClient, args: argparse.Namespace) -> Any:
    connection = resolve_connection(client, args.connection)
    return client.delete(f"/api/v1/connections/{quote(connection['id'])}")


def list_snapshots(client: RelayDBClient, args: argparse.Namespace) -> Any:
    return client.get("/api/v1/snapshots")


def create_snapshot(client: RelayDBClient, args: argparse.Namespace) -> Any:
    environment = resolve_environment(client, args.environment)
    return client.post(f"/api/v1/environments/{quote(environment['id'])}/snapshots", {"name": args.name})


def restore_snapshot(client: RelayDBClient, args: argparse.Namespace) -> Any:
    snapshot = resolve_snapshot(client, args.snapshot)
    environment = resolve_environment(client, args.environment)
    return client.post(f"/api/v1/snapshots/{quote(snapshot['id'])}/restore/{quote(environment['id'])}")


def download_snapshot(client: RelayDBClient, args: argparse.Namespace) -> Any:
    snapshot = resolve_snapshot(client, args.snapshot)
    content = client.get(f"/api/v1/snapshots/{quote(snapshot['id'])}/download")
    output_path = Path(args.output or f"{snapshot['snapshot_name']}.dump")
    output_path.write_bytes(content)
    return {"downloaded": str(output_path), "size_bytes": len(content)}


def upload_snapshot(client: RelayDBClient, args: argparse.Namespace) -> Any:
    environment = resolve_environment(client, args.environment)
    file_path = Path(args.file)
    if not file_path.exists():
        raise CliError(f"Snapshot file not found: {file_path}")
    return client.upload_snapshot(environment["id"], args.name, file_path)


def delete_snapshot(client: RelayDBClient, args: argparse.Namespace) -> Any:
    snapshot = resolve_snapshot(client, args.snapshot)
    return client.delete(f"/api/v1/snapshots/{quote(snapshot['id'])}")


def run_sql(client: RelayDBClient, args: argparse.Namespace) -> Any:
    environment = resolve_environment(client, args.environment)
    statement = args.query if args.query is not None else Path(args.file).read_text(encoding="utf-8")
    return client.post(f"/api/v1/environments/{quote(environment['id'])}/sql", {"sql": statement})


def resolve_project(client: RelayDBClient, value: str) -> dict[str, Any]:
    return resolve_one(client.get("/api/v1/projects")["projects"], value, "project", ["id", "name"])


def resolve_environment(client: RelayDBClient, value: str) -> dict[str, Any]:
    return resolve_one(client.get("/api/v1/environments")["environments"], value, "environment", ["id", "name"])


def resolve_connection(client: RelayDBClient, value: str) -> dict[str, Any]:
    return resolve_one(client.get("/api/v1/connections")["connections"], value, "connection", ["id", "name"])


def resolve_snapshot(client: RelayDBClient, value: str) -> dict[str, Any]:
    return resolve_one(client.get("/api/v1/snapshots")["snapshots"], value, "snapshot", ["id", "snapshot_name"])


def resolve_one(items: list[dict[str, Any]], value: str, label: str, keys: list[str]) -> dict[str, Any]:
    matches = [item for item in items if any(str(item.get(key)) == value for key in keys)]
    if not matches:
        raise CliError(f"Unknown {label}: {value}")
    if len(matches) > 1:
        ids = ", ".join(str(item["id"]) for item in matches)
        raise CliError(f"Ambiguous {label} {value}. Matching ids: {ids}")
    return matches[0]


def quote(value: str) -> str:
    return urllib.parse.quote(value, safe="")


def print_result(result: Any, *, raw_json: bool) -> None:
    if raw_json:
        print(json.dumps(result, indent=2))
        return

    if isinstance(result, dict):
        if "projects" in result:
            print_table(result["projects"], ["id", "name", "description"])
        elif "environments" in result:
            print_table(result["environments"], ["id", "name", "status", "project_id", "host", "port"])
            print(f"active_environment_id: {result.get('active_environment_id')}")
        elif "connections" in result:
            print_table(result["connections"], ["id", "name", "owner", "stable_port", "target_environment_id", "status"])
        elif "snapshots" in result:
            print_table(result["snapshots"], ["id", "snapshot_name", "environment_name", "project_id", "size_bytes"])
        elif "columns" in result and "rows" in result:
            print_sql_result(result)
        else:
            print_key_values(result)
    else:
        print(result)


def print_key_values(result: dict[str, Any]) -> None:
    for key, value in result.items():
        if isinstance(value, dict):
            print(f"{key}:")
            print_key_values({f"  {nested_key}": nested_value for nested_key, nested_value in value.items()})
        else:
            print(f"{key}: {value}")


def print_sql_result(result: dict[str, Any]) -> None:
    rows = result.get("rows", [])
    columns = result.get("columns", [])
    if columns:
        print_table(rows, columns)
    print(f"{result.get('command', 'SQL')} {result.get('row_count', 0)} row(s)")


def print_table(rows: list[dict[str, Any]], columns: list[str]) -> None:
    if not rows:
        print("No rows.")
        return
    widths = {
        column: max(len(column), *(len(format_cell(row.get(column))) for row in rows))
        for column in columns
    }
    header = "  ".join(column.ljust(widths[column]) for column in columns)
    print(header)
    print("  ".join("-" * widths[column] for column in columns))
    for row in rows:
        print("  ".join(format_cell(row.get(column)).ljust(widths[column]) for column in columns))


def format_cell(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return json.dumps(value, separators=(",", ":"))
    return str(value)


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    client = RelayDBClient(args.api_url)
    try:
        result = args.handler(client, args)
        print_result(result, raw_json=args.json)
        return 0
    except CliError as exc:
        print(f"relaydb: error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
