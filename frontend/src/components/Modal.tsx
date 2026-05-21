import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

export function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed left-0 top-0 z-50 flex h-screen w-screen items-center justify-center bg-app/80 p-4 backdrop-blur"
      onMouseDown={onClose}
      role="presentation"
    >
      <div className="pointer-events-none flex h-full w-full items-center justify-center">
        <div onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" className="pointer-events-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
