import { SearchX } from "lucide-react";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center rounded-none border border-dashed border-border-strong/80 bg-app/30 text-center">
      <SearchX className="mb-3 h-7 w-7 text-subtle" />
      <p className="text-sm font-medium text-text/90">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-subtle">{description}</p>
    </div>
  );
}
