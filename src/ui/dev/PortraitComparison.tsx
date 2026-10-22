/**
 * Gallery-only spike: Open Peeps busts (current) next to faces.js (candidate), in Kieler FC colours.
 * Nothing in the game uses faces.js; this page exists so the replacement can be judged by eye.
 */
import { useMemo, useState, type ReactNode } from "react";
import { generate, type FaceConfig, type Race } from "facesjs";
import { Face } from "facesjs/react";
import { PlayerPortrait } from "../components/PlayerPortrait.tsx";
import { PortraitKitProvider } from "../portraits/PortraitKitContext.tsx";
import { DEFAULT_GENERATED_WORLD } from "../../sim/league-divisions.ts";
import { NORDSTERN_TEAM_ID, worldCareerClubId } from "../../world/world-generator.ts";
import { KIELER_FC_TEAM_COLORS, PORTRAIT_COMPARE_SEEDS } from "./ui-gallery-fixtures.ts";

const SIZES = [56, 40, 28] as const;
const JERSEYS = ["football", "hockey", "baseball", "jersey"] as const;
type Jersey = (typeof JERSEYS)[number];

const KIELER_FC_CLUB_ID = worldCareerClubId(NORDSTERN_TEAM_ID);

/** Rough mix for a north-German squad; faces.js picks skin and hair from the race. */
function raceFor(roll: number): Race {
  if (roll < 0.7) return "white";
  if (roll < 0.85) return "black";
  if (roll < 0.95) return "brown";
  return "asian";
}

function xorshift(seed: number): () => number {
  let state = (seed * 2654435761) >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

/** faces.js draws from Math.random; swap in a seeded generator so a seed always gives the same face. */
function seededFace(seed: number, jersey: Jersey): FaceConfig {
  const random = xorshift(seed);
  const original = Math.random;
  Math.random = random;
  try {
    return generate(
      {
        teamColors: KIELER_FC_TEAM_COLORS,
        jersey: { id: jersey },
        accessories: { id: "none" },
        glasses: { id: "none" },
      },
      { gender: "male", race: raceFor(random()) },
    );
  } finally {
    Math.random = original;
  }
}

function Frame({ size, children }: { size: number; children: ReactNode }) {
  return (
    <span className="ui-gallery__face" style={{ width: size, height: size }}>
      {children}
    </span>
  );
}

function FacesJsBust({ face, size }: { face: FaceConfig; size: number }) {
  return (
    <Frame size={size}>
      <Face face={face} className="ui-gallery__facesjs" />
    </Frame>
  );
}

function PeepsBust({ seed, size }: { seed: number; size: number }) {
  return (
    <Frame size={size}>
      <PlayerPortrait seed={seed} clubId={KIELER_FC_CLUB_ID} size="sm" className="ui-gallery__peeps" />
    </Frame>
  );
}

function NoFace({ initials, size }: { initials: string; size: number }) {
  return (
    <Frame size={size}>
      <span className="ui-gallery__initials">{initials}</span>
    </Frame>
  );
}

const TABLE_ROWS = [
  { seed: 11, name: "Finn Bergmann", initials: "FB", pos: "GK", ca: 93 },
  { seed: 23, name: "Samir Böttcher", initials: "SB", pos: "CB", ca: 90 },
  { seed: 37, name: "Kilian Brandt", initials: "KB", pos: "LB", ca: 80 },
  { seed: 41, name: "Jonas Çelik", initials: "JÇ", pos: "CM", ca: 95 },
];

export function PortraitComparison() {
  const [jersey, setJersey] = useState<Jersey>("football");
  const faces = useMemo(
    () => new Map(PORTRAIT_COMPARE_SEEDS.map((seed) => [seed, seededFace(seed, jersey)])),
    [jersey],
  );

  const roster = (kind: "peeps" | "faces" | "none") => (
    <div className="tc-panel">
      <p className="tc-label tc-section__title">
        {kind === "peeps" ? "Open Peeps (now)" : kind === "faces" ? "faces.js" : "No face"}
      </p>
      <table className="tc-table tc-table--compact">
        <tbody>
          {TABLE_ROWS.map((row) => (
            <tr key={row.seed}>
              <td>
                <span className="tc-namecell">
                  {kind === "peeps" ? <PeepsBust seed={row.seed} size={28} /> : null}
                  {kind === "faces" ? <FacesJsBust face={faces.get(row.seed)!} size={28} /> : null}
                  {kind === "none" ? <NoFace initials={row.initials} size={28} /> : null}
                  {row.name}
                </span>
              </td>
              <td className="tc-num">{row.pos}</td>
              <td className="tc-num">
                <span className="tc-rating tc-rating--3">{row.ca}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <PortraitKitProvider worldClubs={DEFAULT_GENERATED_WORLD.clubs}>
      <div className="tc-stack">
        <div className="tc-chips" role="group" aria-label="faces.js jersey style">
          {JERSEYS.map((id) => (
            <button key={id} type="button" className="tc-chip tc-chip--dense" aria-pressed={jersey === id} onClick={() => setJersey(id)}>
              {id}
            </button>
          ))}
        </div>
        {SIZES.map((size) => (
          <div key={size} className="tc-panel ui-gallery__face-band">
            <p className="tc-label tc-section__title">{size}px</p>
            <div className="ui-gallery__face-row">
              <span className="tc-caption ui-gallery__face-label">Open Peeps</span>
              {PORTRAIT_COMPARE_SEEDS.map((seed) => (
                <PeepsBust key={seed} seed={seed} size={size} />
              ))}
            </div>
            <div className="ui-gallery__face-row">
              <span className="tc-caption ui-gallery__face-label">faces.js</span>
              {PORTRAIT_COMPARE_SEEDS.map((seed) => (
                <FacesJsBust key={seed} face={faces.get(seed)!} size={size} />
              ))}
            </div>
          </div>
        ))}
        <div className="ui-gallery__three">
          {roster("peeps")}
          {roster("faces")}
          {roster("none")}
        </div>
      </div>
    </PortraitKitProvider>
  );
}

export default PortraitComparison;
