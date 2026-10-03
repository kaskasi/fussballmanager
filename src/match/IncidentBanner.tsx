import { useEffect, useState } from "react";
import type { MatchViewCue, MatchViewCueDetail } from "@fussballmanager/shared";

const BANNERS: Record<
  Exclude<MatchViewCue, null | "substitution" | "shot">,
  { src: string; alt: string }
> = {
  offside: {
    src: "/match/offside-banner.svg",
    alt: "Abseits",
  },
  throw_in: {
    src: "/match/throw-in-banner.svg",
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

type Incident = {
  cue: Exclude<MatchViewCue, null | "substitution" | "shot">;
  seq: number;
  label?: string;
};

type IncidentBannerProps = {
  cue: MatchViewCue;
  cueDetail?: MatchViewCueDetail;
  seq: number;
};

export function IncidentBanner({ cue, cueDetail, seq }: IncidentBannerProps) {
  const [visible, setVisible] = useState<Incident | null>(null);

  useEffect(() => {
    if (!cue || cue === "substitution" || cue === "shot") return;
    setVisible({ cue, seq, label: cueDetail?.label });
  }, [cue, cueDetail, seq]);

  useEffect(() => {
    if (!visible) return;
    const hide = window.setTimeout(() => setVisible(null), HOLD_MS);
    return () => window.clearTimeout(hide);
  }, [visible?.seq]);

  if (!visible) {
    return null;
  }
  const banner = BANNERS[visible.cue];
  return (
    <div
      key={visible.seq}
      className={`incident-banner incident-banner--${visible.cue}`}
      role="status"
    >
      <img src={banner.src} alt={banner.alt} />
      {visible.label && visible.cue === "goal" ? (
        <p className="incident-banner-scorer">{visible.label}</p>
      ) : null}
    </div>
  );
}
