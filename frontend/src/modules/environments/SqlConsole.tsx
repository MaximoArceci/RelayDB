import { Play, Table2 } from "lucide-react";
import { useState } from "react";
import { executeSql } from "../../api/environments";
import type { PostgresEnvironment, SqlExecutionResponse } from "../../types/environments";

export function SqlConsole({ environment }: { environment: PostgresEnvironment }) {
  const [sql, setSql] = useState("select current_database(), current_user, now();");
  const [result, setResult] = useState<SqlExecutionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  async function runSql() {
    const statement = sql.trim();
    if (!statement) {
      return;
    }

    setIsRunning(true);
    setError(null);
    try {
      setResult(await executeSql(environment.id, statement));
    } catch (runError) {
      setResult(null);
      setError(runError instanceof Error ? runError.message : "SQL execution failed");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="mt-5 rounded-none border border-border bg-app/60 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-text">
          <Table2 className="h-4 w-4 text-accent" />
          SQL console
        </div>
        <button
          onClick={runSql}
          disabled={isRunning || !sql.trim() || environment.status !== "running"}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-none border border-accent bg-accent px-3 text-sm font-medium text-app transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play className="h-4 w-4" />
          {isRunning ? "Running" : "Run"}
        </button>
      </div>

      <textarea
        value={sql}
        onChange={(event) => setSql(event.target.value)}
        spellCheck={false}
        className="mt-4 min-h-36 w-full resize-y rounded-none border border-border bg-app p-3 font-mono text-sm leading-6 text-accent/95 outline-none ring-accent/30 transition focus:border-accent/50 focus:ring-4"
      />

      {error ? <div className="mt-3 rounded-none border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</div> : null}

      {result ? (
        <div className="mt-4">
          <div className="mb-2 text-xs text-subtle">
            {result.command || "SQL"} · {result.row_count} row{result.row_count === 1 ? "" : "s"}
          </div>
          {result.columns.length ? (
            <div className="nexus-scrollbar overflow-auto rounded-none border border-border">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-surface-muted text-muted/80">
                  <tr>
                    {result.columns.map((column) => (
                      <th key={column} className="border-b border-border px-3 py-2 font-medium">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, index) => (
                    <tr key={index} className="odd:bg-app even:bg-surface-muted/40">
                      {result.columns.map((column) => (
                        <td key={column} className="max-w-80 truncate border-b border-border px-3 py-2 font-mono text-text/90">
                          {formatValue(row[column])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-none border border-border bg-surface-muted/70 p-3 text-sm text-muted">Statement executed without a result set.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
