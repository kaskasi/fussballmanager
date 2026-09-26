import { useEffect, useRef } from "react";

export function RowMenu({
  open,
  assigned,
  onToggle,
  onClose,
  onScout,
  onOpenProfile,
}: {
  open: boolean;
  assigned: boolean;
  onToggle: () => void;
  onClose: () => void;
  onScout: () => void;
  onOpenProfile: () => void;
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

  return (
    <div className="row-menu" ref={rootRef}>
      <button
        type="button"
        className="row-menu-trigger"
        aria-label="Aktionen"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
      >
        ⋮
      </button>
      {open ? (
        <div className="row-menu-popover" role="menu">
          <button
            type="button"
            role="menuitem"
            className="row-menu-item"
            disabled={assigned}
            onClick={(event) => {
              event.stopPropagation();
              onScout();
              onClose();
            }}
          >
            {assigned ? "🟢 Scout aktiv" : "👁️ Spieler scouten"}
          </button>
          <button
            type="button"
            role="menuitem"
            className="row-menu-item"
            onClick={(event) => {
              event.stopPropagation();
              onOpenProfile();
              onClose();
            }}
          >
            Profil öffnen
          </button>
        </div>
      ) : null}
    </div>
  );
}
