/** PRD 20 — shared modal backdrop + panel (design.md, Postfach wireframe) */
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { t } from "../../../i18n/index.ts";

export function ModalShell({
  ariaLabel,
  title,
  onClose,
  closeOnBackdrop = true,
  showCloseButton = true,
  panelClassName = "",
  bodyClassName = "surface-scrollbar",
  children,
}: {
  ariaLabel: string;
  title?: ReactNode;
  onClose?: () => void;
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
  panelClassName?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  const handleBackdrop = closeOnBackdrop && onClose ? onClose : undefined;

  return createPortal(
    <div className="modal-backdrop" role="presentation" onClick={handleBackdrop}>
      <div
        className={`modal-shell-panel game-panel${panelClassName ? ` ${panelClassName}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(event) => event.stopPropagation()}
      >
        {(title != null || showCloseButton) && (
          <header className="modal-shell-head">
            {title != null ? <div className="modal-shell-title-wrap">{title}</div> : <span />}
            {showCloseButton && onClose ? (
              <button
                type="button"
                className="modal-shell-close"
                onClick={onClose}
                aria-label={t("shell.modal.close")}
              >
                <X size={18} strokeWidth={2.5} aria-hidden />
              </button>
            ) : null}
          </header>
        )}
        <div className={`modal-shell-body${bodyClassName ? ` ${bodyClassName}` : ""}`}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
