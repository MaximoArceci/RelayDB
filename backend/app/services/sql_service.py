from typing import Any

import psycopg
from fastapi import HTTPException
from psycopg.rows import dict_row

from app.schemas import SqlExecutionResponse
from app.services.environment_registry import EnvironmentRegistry


class SqlService:
    def __init__(self, registry: EnvironmentRegistry | None = None) -> None:
        self.registry = registry or EnvironmentRegistry()

    def execute(self, environment_id: str, sql: str) -> SqlExecutionResponse:
        environment = self.registry.get_environment(environment_id)
        try:
            with psycopg.connect(
                host=environment.host,
                port=environment.port,
                dbname=environment.database,
                user=environment.username,
                password=environment.password,
                connect_timeout=5,
                row_factory=dict_row,
            ) as connection:
                with connection.cursor() as cursor:
                    cursor.execute(sql)
                    columns = [column.name for column in cursor.description or []]
                    rows: list[dict[str, Any]] = cursor.fetchall() if cursor.description else []
                    return SqlExecutionResponse(
                        columns=columns,
                        rows=rows,
                        row_count=cursor.rowcount if cursor.rowcount >= 0 else len(rows),
                        command=cursor.statusmessage or "",
                    )
        except psycopg.Error as exc:
            raise HTTPException(status_code=400, detail=str(exc).strip()) from exc
