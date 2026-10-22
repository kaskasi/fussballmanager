/** WIREFRAME: PRD 03.6.2 / design.md §9.4 — Camp-Leiter inline im Postfach */
import { UserRound } from "lucide-react";
import {
  formatCampLeaderLanguages,
  generateCampLeaderCandidates,
  type CampLeaderCandidate,
} from "../../youth/camp-leader-hire.ts";
import { campNationById, type YouthCamp } from "../../youth/satellite-camps.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import { PlayerPortrait } from "./PlayerPortrait.tsx";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";

export function CampLeaderInboxCard({
  camp,
  masterSeed,
  postIndex,
  postTotal,
  onHire,
  embedded = false,
}: {
  camp: YouthCamp;
  masterSeed: number;
  postIndex: number;
  postTotal: number;
  onHire: (candidate: CampLeaderCandidate) => void;
  embedded?: boolean;
}) {
  useT();
  const nation = campNationById(camp.id);
  const setId = camp.candidate_set_id;
  const candidates =
    setId != null
      ? generateCampLeaderCandidates({
          campId: camp.id,
          masterSeed,
          candidateSetId: setId,
        })
      : [];

  return (
    <div className={embedded ? "camp-leader-inbox-embedded" : undefined}>
      {embedded ? (
        <p className="camp-leader-hire-lead camp-leader-hire-lead--compact">
          {t("postfach.scoutJob.postCount", { index: postIndex, total: postTotal })}
          {" · "}
          {t("postfach.campLeader.lead")}
        </p>
      ) : (
        <div className="inbox-story">
          <p className="inbox-post-count">
            {t("postfach.scoutJob.postCount", { index: postIndex, total: postTotal })}
          </p>
          <p className="inbox-camp-leader-head">
            <UserRound size={18} aria-hidden="true" />
            <strong>{t("postfach.campLeader.cardTitle", { nation: nation?.label ?? camp.id })}</strong>
          </p>
          <p className="camp-leader-hire-lead">{t("postfach.campLeader.lead")}</p>
        </div>
      )}
      <ul className="camp-leader-candidate-list camp-leader-candidate-list--inbox">
        {candidates.map((candidate) => {
          const name = formatPlayerName({
            name: candidate.name,
            portrait_seed: candidate.portrait_seed,
          });
          return (
            <li key={candidate.id}>
              <article
                className={`camp-leader-candidate${candidate.disqualified ? " is-disqualified" : ""}`}
              >
                <PlayerPortrait
                  seed={candidate.portrait_seed} pool="mixed"
                  size={embedded ? "sm" : "md"}
                  className="camp-leader-candidate-portrait"
                />
                <div className="camp-leader-candidate-body">
                  <h3>{name}</h3>
                  <p className="camp-leader-candidate-lang">{formatCampLeaderLanguages(candidate.languages)}</p>
                  <div className="camp-leader-candidate-intro">
                    {candidate.intro.map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                  {candidate.disqualified ? (
                    <p className="camp-leader-candidate-blocked">{candidate.disqualifyReason}</p>
                  ) : (
                    <button
                      type="button"
                      className="inbox-action is-primary camp-leader-inbox-hire"
                      onClick={() => onHire(candidate)}
                    >
                      {t("postfach.campLeader.hire")}
                    </button>
                  )}
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
