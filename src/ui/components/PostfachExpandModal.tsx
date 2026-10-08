/** WIREFRAME: design.md §9.4 — expanded Postfach mail (camp hire, opponent analytics) */
import type { ReactNode } from "react";
import { ModalShell } from "./primitives/ModalShell.tsx";

export function PostfachExpandModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <ModalShell
      ariaLabel={title}
      title={<h3 className="postfach-expand-modal-title">{title}</h3>}
      onClose={onClose}
      panelClassName="postfach-expand-modal"
    >
      {children}
    </ModalShell>
  );
}
