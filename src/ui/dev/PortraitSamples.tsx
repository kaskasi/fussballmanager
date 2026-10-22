/** Gallery: the real PlayerPortrait (faces.js) — sizes, nationality palettes, staff, silhouette, no club. */
import type { ReactNode } from "react";
import { PlayerPortrait } from "../components/PlayerPortrait.tsx";
import { NORDSTERN_TEAM_ID, worldCareerClubId } from "../../world/world-generator.ts";
import { PORTRAIT_SAMPLE_SEEDS } from "./ui-gallery-fixtures.ts";

const KIELER_FC = worldCareerClubId(NORDSTERN_TEAM_ID);
const NATIONS = ["DE", "TR", "PL", "HR", "FR", "BR", "NG"] as const;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ui-gallery__face-row">
      <span className="tc-caption ui-gallery__face-label">{label}</span>
      {children}
    </div>
  );
}

export function PortraitSamples() {
  return (
    <div className="tc-stack">
      {(["lg", "md", "sm"] as const).map((size) => (
        <div key={size} className="tc-panel ui-gallery__face-band">
          <Row label={`${size} · Kieler FC`}>
            {PORTRAIT_SAMPLE_SEEDS.map((seed) => (
              <PlayerPortrait key={seed} seed={seed} size={size} clubId={KIELER_FC} />
            ))}
          </Row>
        </div>
      ))}
      <div className="tc-panel ui-gallery__face-band">
        {NATIONS.map((nation) => (
          <Row key={nation} label={`md · ${nation}`}>
            {PORTRAIT_SAMPLE_SEEDS.slice(0, 8).map((seed) => (
              <PlayerPortrait key={seed} seed={seed * 7 + nation.length} size="md" clubId={KIELER_FC} nationality={nation} />
            ))}
          </Row>
        ))}
        <Row label="Staff (mixed)">
          {PORTRAIT_SAMPLE_SEEDS.slice(0, 8).map((seed) => (
            <PlayerPortrait key={seed} seed={seed + 1000} size="md" pool="mixed" />
          ))}
        </Row>
        <Row label="No club · unknown">
          <PlayerPortrait seed={11} size="md" />
          <PlayerPortrait seed={23} size="md" />
          <PlayerPortrait seed={0} size="md" variant="silhouette" />
          <PlayerPortrait seed={0} size="sm" variant="silhouette" />
        </Row>
      </div>
    </div>
  );
}
