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

export function CampLeaderInboxCard({
  camp,
  masterSeed,
  postIndex,
  postTotal,
  onHire,
}: {
  camp: YouthCamp;
  masterSeed: number;
  postIndex: number;
  postTotal: number;
  onHire: (candidate: CampLeaderCandidate) => void;
}) {
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
    <>
      <div className="inbox-story">
        <p className="inbox-post-count">
          Post · {postIndex}/{postTotal}
        </p>
        <p className="inbox-camp-leader-head">
          <UserRound size={18} aria-hidden="true" />
          <strong>
            Camp-Leiter · {nation?.label ?? camp.id}
          </strong>
        </p>
        <p className="camp-leader-hire-lead">
          Drei Vorstellungen der Agentur — Stärken siehst du nach der Einstellung auf der Camp-Karte.
        </p>
      </div>
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
                  seed={candidate.portrait_seed}
                  size="md"
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
                      Leiter einstellen
                    </button>
                  )}
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </>
  );
}
