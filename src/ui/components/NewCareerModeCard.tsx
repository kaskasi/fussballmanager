import type { ProductGameMode } from "../../narrative/game-mode.ts";
import { useT } from "../../i18n/react.ts";
import { ModalShell } from "./primitives/ModalShell.tsx";

const MODES: ReadonlyArray<{ id: ProductGameMode; icon: string }> = [
  { id: "regionalliga_manager", icon: "📋" },
  { id: "story_mode", icon: "📖" },
];

/** PRD 24 — mode card for a fresh save, between the language pick and the opening story. */
export function NewCareerModeCard({ onPick }: { onPick: (mode: ProductGameMode) => void }) {
  const t = useT();
  return (
    <ModalShell
      ariaLabel={t("newCareer.mode.dialogLabel")}
      closeOnBackdrop={false}
      showCloseButton={false}
      panelClassName="opening-modal inbox-modal"
      bodyClassName=""
    >
      <header className="inbox-head">
        <div>
          <p className="eyebrow">{t("newCareer.mode.eyebrow")}</p>
          <h2>{t("newCareer.mode.title")}</h2>
        </div>
      </header>
      <p className="opening-lead">{t("newCareer.mode.lead")}</p>
      <div className="opening-origin-grid">
        {MODES.map(({ id, icon }) => (
          <button
            key={id}
            type="button"
            className="opening-origin-card"
            onClick={() => onPick(id)}
          >
            <span className="opening-origin-icon" aria-hidden="true">
              {icon}
            </span>
            <strong>{t(`newCareer.mode.${id}.title`)}</strong>
            <span>{t(`newCareer.mode.${id}.hint`)}</span>
          </button>
        ))}
      </div>
    </ModalShell>
  );
}
