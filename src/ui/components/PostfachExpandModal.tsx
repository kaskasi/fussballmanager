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
      variant="tc"
      ariaLabel={title}
      title={<h2 className="tc-modal__title">{title}</h2>}
      onClose={onClose}
      panelClassName="tc-modal--wide postfach-expand-modal"
    >
      {children}
    </ModalShell>
  );
}
