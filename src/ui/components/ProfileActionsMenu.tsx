import { useEffect, useRef } from "react";
import type { ProfileMenuItem } from "../../player/profile-actions.ts";

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
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, [open, onClose]);

  if (items.length === 0) return null;

  return (
    <div className="row-menu profile-actions-menu" ref={rootRef}>
      <button
        type="button"
        className="row-menu-trigger"
        aria-label="Spieleraktionen"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={onToggle}
      >
        ⋮
      </button>
      {open ? (
        <div className="row-menu-popover profile-actions-popover" role="menu">
          {items.map((item) => (
            <button
              key={item.action}
              type="button"
              role="menuitem"
              className={`row-menu-item${item.action === "release" ? " row-menu-item-danger" : ""}`}
              title={item.hint}
              onClick={() => {
                onSelect(item.action);
                onClose();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
