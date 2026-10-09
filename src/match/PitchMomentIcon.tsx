import { useEffect, useState } from "react";
import type { MatchViewCue, MatchViewCueDetail } from "@fussballmanager/shared";
import { MOMENT_CUE_ICONS } from "./moment-cue-icons.ts";

const HOLD_MS = 1500;

type PitchMomentIconProps = {
  cue: MatchViewCue;
  cueDetail?: MatchViewCueDetail;
  seq: number;
};

export function PitchMomentIcon({ cue, cueDetail, seq }: PitchMomentIconProps) {
  const [visible, setVisible] = useState<MatchViewCue | null>(null);

  useEffect(() => {
    if (!cue || cue === "substitution" || cue === "shot") return;
    if (!MOMENT_CUE_ICONS[cue]) return;
    setVisible(cue);
  }, [cue, seq]);

  useEffect(() => {
    if (!visible) return;
    const hide = window.setTimeout(() => setVisible(null), HOLD_MS);
    return () => window.clearTimeout(hide);
  }, [visible, seq]);

  if (!visible) return null;

  const icon = MOMENT_CUE_ICONS[visible as keyof typeof MOMENT_CUE_ICONS];
  if (!icon) return null;

  return (
    <div
      key={seq}
      className={`pitch-moment-icon pitch-moment-icon--${visible}`}
      role="status"
      aria-label={icon.alt}
    >
      <img src={icon.src} alt="" width={22} height={22} decoding="async" />
      {cueDetail?.label && visible === "goal" ? (
        <span className="pitch-moment-icon-label">{cueDetail.label}</span>
      ) : null}
    </div>
  );
}
