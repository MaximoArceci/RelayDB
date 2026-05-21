export function LoadingState() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-2/3 animate-pulse rounded bg-border" />
      <div className="h-24 animate-pulse rounded-none bg-surface-muted" />
      <div className="h-24 animate-pulse rounded-none bg-surface-muted" />
    </div>
  );
}
