/** WIREFRAME: PRD 03.6.2 / design.md §9 — Camp-Leiter Auswahl (Effekte erst auf Camp-Karte) */
import { UserRound } from "lucide-react";
import {
  formatCampLeaderLanguages,
  generateCampLeaderCandidates,
  type CampLeaderCandidate,
} from "../../youth/camp-leader-hire.ts";
import { campNationById, type YouthCamp } from "../../youth/satellite-camps.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import { PlayerPortrait } from "./PlayerPortrait.tsx";

export function CampLeaderHireModal({
  camp,
  masterSeed,
  onHire,
  onClose,
}: {
  camp: YouthCamp;
  masterSeed: number;
  onHire: (candidate: CampLeaderCandidate) => void;
  onClose: () => void;
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
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <dialog
        className="negotiation-modal camp-leader-hire-modal"
        open
        aria-labelledby="camp-leader-hire-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="negotiation-modal-inner">
          <header className="negotiation-modal-head">
            <UserRound size={22} aria-hidden="true" />
            <h2 id="camp-leader-hire-title">Camp-Leiter · {nation?.label ?? camp.id}</h2>
          </header>
          <p className="camp-leader-hire-lead">
            Drei Vorstellungen der Agentur — Stärken siehst du nach der Einstellung auf der Camp-Karte.
          </p>
          <ul className="camp-leader-candidate-list">
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
                          className="negotiation-btn negotiation-btn-primary"
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
          <footer className="negotiation-modal-actions">
            <button type="button" className="negotiation-btn" onClick={onClose}>
              Später
            </button>
          </footer>
        </div>
      </dialog>
    </div>
  );
}
