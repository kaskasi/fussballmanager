import { useMemo, useState } from "react";
import {
  ACADEMY_FACILITIES,
  facilityById,
  facilityGate,
  groupCampusBadges,
  type CampusBadge,
  type CoachIcon,
} from "../../youth/academy.ts";
import { generateYouthIntake, type AcademyFacility } from "../../youth/intake-generator.ts";

/**
 * WIREFRAME: PRD 09.2 Screen 2 — Youth Campus (2D iso)
 *
 * ┌────────────────────────────────────────────────────────┐
 * │ 🏫 Jugendhaus                                          │
 * │                                                        │
 * │     [🏠 owned]    [🏋️ gate]    [⭐ gate]             │
 * │                                                        │
 * │ click owned building → Screen 2a Jahrgang             │
 * └────────────────────────────────────────────────────────┘
 *
 * Screen 2a
 * ┌────────────────────────────────────────────────────────┐
 * │ [←] Jahrgang                                           │
 * │ 🚀  badges                                             │
 * │ ➡️  GK CB CM …                                         │
 * │ ⚠️  badges                                             │
 * │ 😞  badges                                             │
 * │ departure badge: red edge + 🚩 → inbox                 │
 * └────────────────────────────────────────────────────────┘
 *
 * Coach icons stay ➡️ until the youth sim exists. The building
 * the club owns is the free Jugendhaus. The other two are visible
 * and gated. Paying for them is not this screen.
 */

const OWNED: AcademyFacility = "academy_basic";
const STADIUM_CAPACITY = 0;

export function YouthCampus() {
  const [yearOpen, setYearOpen] = useState(false);
  const [inboxId, setInboxId] = useState<string | null>(null);
  const badges = useMemo(() => previewBadges(), []);
  const inbox = badges.find((badge) => badge.playerId === inboxId) ?? null;

  return (
    <main className="campus">
      {yearOpen ? (
        <YearGroup
          badges={badges}
          onBack={() => {
            setInboxId(null);
            setYearOpen(false);
          }}
          onDeparture={(playerId) => setInboxId(playerId)}
        />
      ) : (
        <CampusGround onOpenYear={() => setYearOpen(true)} />
      )}
      {inbox ? <Inbox badge={inbox} onClose={() => setInboxId(null)} /> : null}
    </main>
  );
}

function CampusGround({ onOpenYear }: { onOpenYear: () => void }) {
  const owned = facilityById(OWNED);
  return (
    <section>
      <p className="eyebrow">Jugend</p>
      <h1>
        <span aria-hidden="true">{owned.icon}</span> {owned.name}
      </h1>
      <div className="campus-ground">
        {ACADEMY_FACILITIES.map((facility) => {
          const gate = facilityGate(OWNED, facility.id, STADIUM_CAPACITY);
          const current = gate.status === "current";
          return (
            <button
              key={facility.id}
              type="button"
              className={current ? "campus-building" : "campus-building is-locked"}
              disabled={!current}
              onClick={current ? onOpenYear : undefined}
              title={facility.effect}
              aria-label={current ? `${facility.name}, Jahrgang öffnen` : facility.name}
            >
              <IsoBuilding facility={facility.id} />
              <span className="campus-building-name">
                <span aria-hidden="true">{facility.icon}</span> {facility.name}
              </span>
              <GateMark gate={gate} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function GateMark({ gate }: { gate: ReturnType<typeof facilityGate> }) {
  if (gate.status === "needs_stadium") {
    return (
      <span className="campus-gate">
        <span aria-hidden="true">🏟️</span> {gate.capacity.toLocaleString("de-DE")}
      </span>
    );
  }
  if (gate.status === "needs_performance") {
    return (
      <span className="campus-gate">
        <span aria-hidden="true">🏋️</span>
      </span>
    );
  }
  if (gate.status === "current") {
    return <span className="campus-gate">●</span>;
  }
  return <span className="campus-gate">◆</span>;
}

function YearGroup({
  badges,
  onBack,
  onDeparture,
}: {
  badges: CampusBadge[];
  onBack: () => void;
  onDeparture: (playerId: string) => void;
}) {
  const groups = groupCampusBadges(badges);
  return (
    <section>
      <p className="eyebrow">Jahrgang</p>
      <div className="campus-year-head">
        <button type="button" onClick={onBack} aria-label="Zurück zum Campus">
          ←
        </button>
        <h1>U17</h1>
      </div>
      {groups.map((group) => (
        <div key={group.icon} className="campus-group">
          <h2 aria-label={`Coach ${group.icon}`}>{group.icon}</h2>
          <ul>
            {group.badges.map((badge) => (
              <li key={badge.playerId}>
                <button
                  type="button"
                  className={badge.departureRisk ? "campus-badge is-risk" : "campus-badge"}
                  title={badge.playerId}
                  disabled={!badge.departureRisk}
                  onClick={badge.departureRisk ? () => onDeparture(badge.playerId) : undefined}
                >
                  <span className="campus-position">{badge.position}</span>
                  {badge.departureRisk ? <span aria-hidden="true">🚩</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function Inbox({ badge, onClose }: { badge: CampusBadge; onClose: () => void }) {
  return (
    <div className="campus-inbox" role="dialog" aria-label="Entscheidungs-Inbox">
      <p>
        <span aria-hidden="true">🚩</span> {badge.position}
      </p>
      <div className="campus-actions" aria-label="Aktionen">
        <span title="Leihen">🔄</span>
        <span title="Hochziehen">⬆️</span>
        <span title="Vertrag">✍️</span>
        <span title="Trainingsfokus">💪</span>
      </div>
      <button type="button" onClick={onClose} aria-label="Schließen">
        ←
      </button>
    </div>
  );
}

function IsoBuilding({ facility }: { facility: AcademyFacility }) {
  const height = facility === "academy_elite" ? 52 : facility === "academy_performance" ? 38 : 26;
  const halfW = facility === "academy_basic" ? 26 : 36;
  const halfD = 14;
  const roof =
    facility === "academy_elite" ? "#f5c16c" : facility === "academy_performance" ? "#5eead4" : "#4ade80";
  const cx = 70;
  const foot = 86;
  const top = foot - height;
  return (
    <svg className="iso" viewBox="0 0 140 112" aria-hidden="true">
      <polygon
        points={`${cx},${top} ${cx + halfW},${top + halfD} ${cx},${top + halfD * 2} ${cx - halfW},${top + halfD}`}
        fill={roof}
      />
      <polygon
        points={`${cx - halfW},${top + halfD} ${cx},${top + halfD * 2} ${cx},${foot + halfD} ${cx - halfW},${foot}`}
        fill="#166534"
      />
      <polygon
        points={`${cx + halfW},${top + halfD} ${cx},${top + halfD * 2} ${cx},${foot + halfD} ${cx + halfW},${foot}`}
        fill="#15803d"
      />
      {facility !== "academy_basic" ? (
        <polygon
          points={`${cx - 8},${foot - 8} ${cx + 8},${foot - 8} ${cx + 8},${foot + 6} ${cx - 8},${foot + 6}`}
          fill="#ecfdf5"
        />
      ) : (
        <polygon points={`${cx - 5},${foot - 2} ${cx + 5},${foot - 2} ${cx + 5},${foot + 8} ${cx - 5},${foot + 8}`} fill="#ecfdf5" />
      )}
    </svg>
  );
}

function previewBadges(): CampusBadge[] {
  const players = generateYouthIntake({
    season: 1,
    week: 34,
    seasonYear: 2026,
    clubId: "cl_fc_nordstern",
    nationality: "DE",
    region: "Schleswig-Holstein",
    facility: OWNED,
    idStart: 1,
    random: mulberry32(2026),
  });
  return players.map((player) => ({
    playerId: player.id,
    position: player.position,
    coachIcon: "➡️" satisfies CoachIcon,
    departureRisk: false,
  }));
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
