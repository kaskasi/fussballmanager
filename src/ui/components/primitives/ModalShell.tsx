/** PRD 20 — shared modal backdrop + panel (design.md, Postfach wireframe) */
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { t } from "../../../i18n/index.ts";

/**
 * `variant="tc"` renders the design-system modal (`tc-scrim` / `tc-modal`, design.md §4.3) with Escape to close.
 * `legacy` keeps the old panel until each caller's screen migrates; then the default flips and legacy goes.
 */
export function ModalShell({
  ariaLabel,
  title,
  onClose,
  closeOnBackdrop = true,
  showCloseButton = true,
  panelClassName = "",
  bodyClassName = "surface-scrollbar",
  variant = "legacy",
  footer,
  children,
}: {
  ariaLabel: string;
  title?: ReactNode;
  onClose?: () => void;
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
  panelClassName?: string;
  bodyClassName?: string;
  variant?: "legacy" | "tc";
  /** tc variant only: action row under the body. */
  footer?: ReactNode;
  children: ReactNode;
}) {
  const handleBackdrop = closeOnBackdrop && onClose ? onClose : undefined;

  useEffect(() => {
    if (variant !== "tc" || !onClose) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [variant, onClose]);

  if (variant === "tc") {
    return createPortal(
      <div className="tc-scrim" role="presentation" onClick={handleBackdrop}>
        <div
          className={`tc-modal${panelClassName ? ` ${panelClassName}` : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          onClick={(event) => event.stopPropagation()}
        >
          {(title != null || showCloseButton) && (
            <div className="tc-modal__head">
              {title != null ? <div>{title}</div> : <span />}
              {showCloseButton && onClose ? (
                <button type="button" className="tc-iconbtn" onClick={onClose} aria-label={t("shell.modal.close")} autoFocus>
                  <X className="tc-icon" aria-hidden />
                </button>
              ) : null}
            </div>
          )}
          <div className={`tc-modal__body${bodyClassName ? ` ${bodyClassName}` : ""}`}>{children}</div>
          {footer != null ? <div className="tc-modal__foot">{footer}</div> : null}
        </div>
      </div>,
      document.body,
    );
  }

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
