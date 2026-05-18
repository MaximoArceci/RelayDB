import { Database, LogIn, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";

export function AuthPanel({
  error,
  isLoading,
  onLogin,
  onRegister,
}: {
  error: string | null;
  isLoading: boolean;
  onLogin: (email: string, password: string) => void;
  onRegister: (name: string, email: string, password: string) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "login") {
      onLogin(email, password);
    } else {
      onRegister(name, email, password);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 text-slate-100">
      <form onSubmit={submit} className="w-full max-w-md rounded-xl border border-slate-800 bg-graphite-900/90 p-5 shadow-glow backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-300/10">
            <Database className="h-5 w-5 text-cyan-200" />
          </div>
          <div>
            <div className="text-lg font-semibold text-white">RelayDB</div>
            <div className="text-xs text-slate-500">Local infrastructure control plane</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 rounded-lg border border-slate-800 bg-slate-950/70 p-1">
          <button type="button" onClick={() => setMode("login")} className={`h-9 rounded-md text-sm ${mode === "login" ? "bg-cyan-300/10 text-cyan-100" : "text-slate-400"}`}>
            Login
          </button>
          <button type="button" onClick={() => setMode("register")} className={`h-9 rounded-md text-sm ${mode === "register" ? "bg-cyan-300/10 text-cyan-100" : "text-slate-400"}`}>
            Register
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {mode === "register" ? (
            <Field label="Name" value={name} onChange={setName} autoComplete="name" />
          ) : null}
          <Field label="Email" value={email} onChange={setEmail} autoComplete="email" type="email" />
          <Field label="Password" value={password} onChange={setPassword} autoComplete={mode === "login" ? "current-password" : "new-password"} type="password" />
        </div>

        {error ? <div className="mt-4 rounded-lg border border-signal-red/30 bg-signal-red/10 p-3 text-sm text-signal-red">{error}</div> : null}

        <button
          type="submit"
          disabled={isLoading}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 text-sm font-medium text-cyan-100 transition hover:border-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {isLoading ? "Authenticating" : mode === "login" ? "Login" : "Create user"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        autoComplete={autoComplete}
        className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none ring-cyan-300/30 transition focus:border-cyan-300/50 focus:ring-4"
      />
    </label>
  );
}
