import { useEffect, useState } from "react";
import type { MatchViewCue, MatchViewCueDetail } from "@fussballmanager/shared";

const BANNERS: Record<
  Exclude<MatchViewCue, null | "substitution">,
  { src: string; alt: string }
> = {
  offside: {
    src: "/match/offside-banner.png",
    alt: "Abseits",
  },
  throw_in: {
    src: "/match/throw-in-banner.png",
    alt: "Einwurf",
  },
  goal: {
    src: "/match/goal-banner.svg",
    alt: "Tor",
  },
  corner: {
    src: "/match/corner-banner.svg",
    alt: "Ecke",
  },
  penalty: {
    src: "/match/penalty-banner.svg",
    alt: "Elfmeter",
  },
};

const HOLD_MS = 2600;

type IncidentBannerProps = {
  cue: MatchViewCue;
  cueDetail?: MatchViewCueDetail;
  seq: number;
};

export function IncidentBanner({ cue, cueDetail, seq }: IncidentBannerProps) {
  const [shown, setShown] = useState<{
    cue: Exclude<MatchViewCue, null | "substitution">;
    seq: number;
    label?: string;
  } | null>(null);

  useEffect(() => {
    if (!cue || cue === "substitution") return;
    setShown({ cue, seq, label: cueDetail?.label });
    const hide = window.setTimeout(() => setShown(null), HOLD_MS);
    return () => window.clearTimeout(hide);
  }, [cue, cueDetail, seq]);

  if (!shown) {
    return null;
  }
  const banner = BANNERS[shown.cue];
  return (
    <div className={`incident-banner incident-banner--${shown.cue}`} role="status">
      <img src={banner.src} alt={banner.alt} />
      {shown.label && shown.cue === "goal" ? (
        <p className="incident-banner-scorer">{shown.label}</p>
      ) : null}
    </div>
  );
}
