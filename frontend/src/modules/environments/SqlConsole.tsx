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
    <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <Table2 className="h-4 w-4 text-cyan-200" />
          SQL console
        </div>
        <button
          onClick={runSql}
          disabled={isRunning || !sql.trim() || environment.status !== "running"}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 text-sm font-medium text-cyan-100 transition hover:border-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play className="h-4 w-4" />
          {isRunning ? "Running" : "Run"}
        </button>
      </div>

      <textarea
        value={sql}
        onChange={(event) => setSql(event.target.value)}
        spellCheck={false}
        className="mt-4 min-h-36 w-full resize-y rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-sm leading-6 text-cyan-50 outline-none ring-cyan-300/30 transition focus:border-cyan-300/50 focus:ring-4"
      />

      {error ? <div className="mt-3 rounded-lg border border-signal-red/30 bg-signal-red/10 p-3 text-sm text-signal-red">{error}</div> : null}

      {result ? (
        <div className="mt-4">
          <div className="mb-2 text-xs text-slate-500">
            {result.command || "SQL"} · {result.row_count} row{result.row_count === 1 ? "" : "s"}
          </div>
          {result.columns.length ? (
            <div className="nexus-scrollbar overflow-auto rounded-lg border border-slate-800">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    {result.columns.map((column) => (
                      <th key={column} className="border-b border-slate-800 px-3 py-2 font-medium">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, index) => (
                    <tr key={index} className="odd:bg-slate-950 even:bg-slate-900/40">
                      {result.columns.map((column) => (
                        <td key={column} className="max-w-80 truncate border-b border-slate-800 px-3 py-2 font-mono text-slate-200">
                          {formatValue(row[column])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-300">Statement executed without a result set.</div>
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
