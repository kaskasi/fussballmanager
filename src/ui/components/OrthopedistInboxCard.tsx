import { useMemo } from "react";
import { Stethoscope } from "lucide-react";
import {
  orthopedistCandidates,
  type OrthopedistCandidate,
} from "../../medical/orthopedist-hire.ts";
import { PlayerPortrait } from "./PlayerPortrait.tsx";
import { useT } from "../../i18n/react.ts";

export function OrthopedistInboxCard({
  masterSeed,
  season,
  week,
  onHire,
}: {
  masterSeed: number;
  season: number;
  week: number;
  onHire: (candidate: OrthopedistCandidate) => void;
}) {
  const t = useT();
  const candidates = useMemo(
    () => orthopedistCandidates(masterSeed, season, week),
    [masterSeed, season, week],
  );

  return (
    <div className="camp-leader-inbox-card medical-ortho-inbox">
      <p className="medical-muted">{t("medical.ortho.inboxIntro")}</p>
      <ul className="medical-ortho-candidate-list">
        {candidates.map((candidate) => (
          <li key={candidate.id} className="medical-ortho-candidate">
            <PlayerPortrait seed={candidate.portrait_seed} size="md" />
            <div>
              <strong>
                <Stethoscope size={14} aria-hidden /> {candidate.name}
              </strong>
              <p className="medical-muted">Q{candidate.quality}</p>
              <p>{candidate.intro}</p>
            </div>
            <button type="button" className="ui-btn ui-btn--sm" onClick={() => onHire(candidate)}>
              {t("medical.staff.hire")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
