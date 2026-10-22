import { useEffect, useRef } from "react";
import { MoreVertical } from "lucide-react";
import type { ProfileMenuItem } from "../../player/profile-actions.ts";
import { t } from "../../i18n/index.ts";

/** ⋮ menu for destructive squad actions on the profile (tc-menu, design.md §4.3). */
export function ProfileActionsMenu({
  open,
  items,
  onToggle,
  onClose,
  onSelect,
}: {
  open: boolean;
  items: readonly ProfileMenuItem[];
  onToggle: () => void;
  onClose: () => void;
  onSelect: (action: ProfileMenuItem["action"]) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) onClose();
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  if (items.length === 0) return null;

  return (
    <div className="tc-menu" ref={rootRef}>
      <button
        type="button"
        className="tc-iconbtn"
        aria-label={t("profile.moreActions")}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={onToggle}
      >
        <MoreVertical className="tc-icon" aria-hidden />
      </button>
      {open ? (
        <div className="tc-menu__list" role="menu">
          {items.map((item) => (
            <button
              key={item.action}
              type="button"
              role="menuitem"
              className={item.action === "release" ? "tc-menu__item tc-menu__item--danger" : "tc-menu__item"}
              onClick={() => {
                onSelect(item.action);
                onClose();
              }}
            >
              <span className="tc-menu__label">{item.label}</span>
              <span className="tc-menu__hint">{item.hint}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
