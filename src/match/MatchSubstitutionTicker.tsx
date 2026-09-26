import { useEffect, useState } from "react";
import type { MatchViewCue, MatchViewCueDetail } from "@fussballmanager/shared";

const HOLD_MS = 3200;

export function MatchSubstitutionTicker({
  cue,
  cueDetail,
  seq,
}: {
  cue: MatchViewCue;
  cueDetail?: MatchViewCueDetail;
  seq: number;
}) {
  const [shown, setShown] = useState<{ seq: number; label: string; team?: string } | null>(null);

  useEffect(() => {
    if (cue !== "substitution" || !cueDetail?.label) return;
    setShown({ seq, label: cueDetail.label, team: cueDetail.teamShortName });
    const hide = window.setTimeout(() => setShown(null), HOLD_MS);
    return () => window.clearTimeout(hide);
  }, [cue, cueDetail, seq]);

  if (!shown) return null;

  return (
    <div className="match-sub-ticker" role="status">
      <span className="match-sub-ticker-label">Wechsel</span>
      {shown.team ? <span className="match-sub-ticker-team">{shown.team}</span> : null}
      <span className="match-sub-ticker-players">{shown.label}</span>
    </div>
  );
}
