import { useEffect, useRef, type ReactNode } from "react";
import { useI18n } from "../i18n";

/** Native modal dialog supplies focus trapping, Escape and inert background. */
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useI18n();
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog ref={ref} className="modal" aria-label={title} onCancel={onClose}>
      <div className="modal-head">
        <h2>{title}</h2>
        <button onClick={onClose} aria-label={t("Close dialog")}>
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
