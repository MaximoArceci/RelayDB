import { AlertTriangle, XCircle, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useToastStore, type ToastTone } from "../stores/toastStore";

export function ToastViewport() {
  const { toasts, dismissToast } = useToastStore();

  if (toasts.length === 0) {
    return null;
  }

  return createPortal(
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2" aria-live="assertive">
      {toasts.map((toast) => {
        const Icon = toast.tone === "warning" ? AlertTriangle : XCircle;
        return (
          <div key={toast.id} className={`pointer-events-auto border bg-surface-raised p-4 shadow-risk ${toneClass(toast.tone)}`}>
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-text">{toast.title}</div>
                {toast.description ? <div className="mt-1 text-sm leading-5 text-muted">{toast.description}</div> : null}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center border border-border-strong text-muted transition hover:text-text"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}

function toneClass(tone: ToastTone) {
  if (tone === "warning") {
    return "border-warning/40 text-warning";
  }
  return "border-danger/40 text-danger";
}
