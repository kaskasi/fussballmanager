/** Manager Desk — 3-row training block (match preview or Sunday off), empty-slot styling */
import { ClubCrest } from "./ClubCrest.tsx";
import { clubLogoUrlForId } from "../assets/club-logo.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";

export function HubTrainingDayPlaceholder({
  variant,
  opponentShortName,
  opponentClubId,
  onOpenScouting,
}: {
  variant: "sunday-off" | "match";
  opponentShortName?: string;
  opponentClubId?: string | null;
  onOpenScouting?: () => void;
}) {
  useT();

  if (variant === "match" && opponentShortName) {
    const initials = opponentShortName.slice(0, 2).toUpperCase();
    return (
      <article className="training-slot training-slot-placeholder is-empty hub-desk-day-block hub-desk-day-block--match">
        <div className="training-slot-main hub-desk-day-block__main">
          <span className="training-period">{t("hub.desk.matchBlock.period")}</span>
          {opponentClubId ? (
            <span className="hub-desk-day-block__crest">
              <ClubCrest
                initials={initials}
                logoSrc={clubLogoUrlForId(opponentClubId)}
                size={40}
                alt={opponentShortName}
              />
            </span>
          ) : null}
          <strong className="training-unit-name">{opponentShortName}</strong>
          <span className="training-group training-group--muted">{t("hub.desk.matchBlock.hint")}</span>
          {onOpenScouting ? (
            <button type="button" className="link-btn hub-desk-day-block__link" onClick={onOpenScouting}>
              {t("shell.nav.scouting")}
            </button>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <article className="training-slot training-slot-placeholder is-empty hub-desk-day-block hub-desk-day-block--off">
      <div className="training-slot-main hub-desk-day-block__main">
        <span className="training-period">{t("hub.desk.sundayOff.period")}</span>
        <strong className="training-unit-name training-unit-name--empty">{t("hub.desk.sundayOff.title")}</strong>
        <span className="training-group training-group--muted">{t("hub.desk.sundayOff.hint")}</span>
      </div>
    </article>
  );
}
