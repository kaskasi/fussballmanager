import type { TeamId } from "@fussballmanager/shared";
import type { JobOffer } from "../../board/job-offers.ts";
import { formatClubCash } from "../../economy/club-finances.ts";
import { useT } from "../../i18n/react.ts";
import type { CareerActTransition } from "../../narrative/story-state.ts";
import { ModalShell } from "./primitives/ModalShell.tsx";

function outcomeKey(transition: CareerActTransition): string {
  if (transition.outcome === "relegated") return transition.via_playoff ? "playoffLost" : "relegated";
  return transition.via_playoff ? "playoffWon" : "survived";
}

/** PRD 19 Act 1 → 2 — not dismissable: NEXT stays blocked until an offer is signed. */
export function StoryActTransitionModal({
  transition,
  clubName,
  offers,
  followerNames,
  onAccept,
}: {
  transition: CareerActTransition;
  clubName: string;
  offers: readonly JobOffer[];
  followerNames: readonly string[];
  onAccept: (teamId: TeamId) => void;
}) {
  const t = useT();
  const key = outcomeKey(transition);
  return (
    <ModalShell
      ariaLabel={t("story.transition.dialogLabel")}
      closeOnBackdrop={false}
      showCloseButton={false}
      panelClassName="opening-modal inbox-modal"
      bodyClassName=""
    >
      <header className="inbox-head">
        <div>
          <p className="eyebrow">{t("story.transition.eyebrow")}</p>
          <h2>{t(`story.act1End.${key}.title`)}</h2>
        </div>
      </header>
      <p className="opening-lead">
        {t(`story.transition.lead.${transition.outcome}`, {
          club: clubName,
          place: String(transition.final_place),
        })}
      </p>
      {followerNames.length > 0 ? (
        <p className="opening-language-note">
          {t("story.transition.followers", { names: followerNames.join(", ") })}
        </p>
      ) : null}
      <div className="opening-origin-grid">
        {offers.map((offer) => (
          <button
            key={offer.clubId}
            type="button"
            className="opening-origin-card"
            onClick={() => onAccept(offer.clubId)}
          >
            <strong>{offer.clubName}</strong>
            <span>{offer.divisionLabel}</span>
            <span>{t("story.transition.chairmanGoal")}</span>
            <span>{t("story.transition.bonus", { amount: formatClubCash(offer.signingBonus) })}</span>
          </button>
        ))}
      </div>
    </ModalShell>
  );
}
