import { useEffect, useState } from "react";
import type { MatchViewCue, MatchViewCueDetail } from "@fussballmanager/shared";

const HOLD_MS = 3200;

type Substitution = {
  seq: number;
  label: string;
  team?: string;
};

export function MatchSubstitutionTicker({
  cue,
  cueDetail,
  seq,
}: {
  cue: MatchViewCue;
  cueDetail?: MatchViewCueDetail;
  seq: number;
}) {
  const [visible, setVisible] = useState<Substitution | null>(null);

  useEffect(() => {
    if (cue !== "substitution" || !cueDetail?.label) return;
    setVisible({ seq, label: cueDetail.label, team: cueDetail.teamShortName });
  }, [cue, cueDetail, seq]);

  useEffect(() => {
    if (!visible) return;
    const hide = window.setTimeout(() => setVisible(null), HOLD_MS);
    return () => window.clearTimeout(hide);
  }, [visible?.seq]);

  if (!visible) return null;

  return (
    <div key={visible.seq} className="match-sub-ticker" role="status">
      <span className="match-sub-ticker-label">Wechsel</span>
      {visible.team ? <span className="match-sub-ticker-team">{visible.team}</span> : null}
      <span className="match-sub-ticker-players">{visible.label}</span>
    </div>
  );
}
