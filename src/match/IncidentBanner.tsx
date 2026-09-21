import { useEffect, useState } from "react";
import type { MatchViewFrame } from "@fussballmanager/shared";

const BANNERS = {
  offside: {
    src: "/match/offside-banner.png",
    alt: "Offside",
  },
  throw_in: {
    src: "/match/throw-in-banner.png",
    alt: "Throw-in",
  },
} as const;

const HOLD_MS = 2600;

type IncidentBannerProps = {
  cue: MatchViewFrame["cue"];
  seq: number;
};

export function IncidentBanner({ cue, seq }: IncidentBannerProps) {
  const [shown, setShown] = useState<{
    cue: keyof typeof BANNERS;
    seq: number;
  } | null>(null);

  useEffect(() => {
    if (cue !== "offside" && cue !== "throw_in") {
      return;
    }
    setShown({ cue, seq });
    const hide = window.setTimeout(() => setShown(null), HOLD_MS);
    return () => window.clearTimeout(hide);
  }, [cue, seq]);

  if (!shown) {
    return null;
  }
  const banner = BANNERS[shown.cue];
  return (
    <div className="incident-banner" role="status">
      <img src={banner.src} alt={banner.alt} />
    </div>
  );
}
