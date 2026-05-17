import { SearchX } from "lucide-react";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-slate-700/80 bg-slate-950/30 text-center">
      <SearchX className="mb-3 h-7 w-7 text-slate-500" />
      <p className="text-sm font-medium text-slate-200">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-slate-500">{description}</p>
    </div>
  );
}
