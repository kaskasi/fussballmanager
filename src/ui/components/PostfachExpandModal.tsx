/** WIREFRAME: design.md §9.4 — expanded Postfach mail (camp hire, opponent analytics) */
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";

export function PostfachExpandModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useT();

  return createPortal(
    <div className="modal-backdrop postfach-expand-backdrop" role="presentation" onClick={onClose}>
      <div
        className="postfach-expand-modal game-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="postfach-expand-modal-head">
          <h3 className="postfach-expand-modal-title">{title}</h3>
          <button type="button" className="inbox-close" onClick={onClose} aria-label={t("inbox.modal.close")}>
            <X size={18} strokeWidth={2.5} aria-hidden />
          </button>
        </header>
        <div className="postfach-expand-modal-body surface-scrollbar">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
