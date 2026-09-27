import { useMemo } from "react";
import { formatClubCash } from "../../economy/club-finances.ts";
import {
  COACH_ROLE_ICONS,
  COACH_ROLE_LABELS,
  COACH_ROLES,
  coachCandidates,
  coachEnvironmentFactor,
  environmentFromCoachingStaff,
  staffEnvironmentLabel,
  type Coach,
  type CoachRole,
  type CoachingStaff,
} from "../../staff/coaching-staff.ts";
import { Hint } from "./Hint.tsx";

/**
 * WIREFRAME: PRD 09 — F8.1 Trainerstab
 * ┌──────────────────────────────────────────────┐
 * │ 🧢 Trainer · Environment ×1.04             │
 * │ ⚔️ Angriff   Markus L. · Q68 · €7.3k       │
 * │ 🛡️ Verteid.  …                              │
 * │ 💪 Fitness   …                              │
 * │ Kandidaten · Einstellen                     │
 * └──────────────────────────────────────────────┘
 */

export function CoachingStaffPanel({
  staff,
  season,
  week,
  masterSeed,
  cash,
  onHire,
}: {
  staff: CoachingStaff;
  season: number;
  week: number;
  masterSeed: number;
  cash: number;
  onHire: (coach: Coach) => void;
}) {
  const environment = environmentFromCoachingStaff(staff);

  return (
    <section className="training-staff" aria-label="Trainerstab">
      <header className="training-staff-head">
        <Hint
          text="Trainer verbessern das Entwicklungs-Umfeld (environment) in der Growth Engine — nicht Minuten oder Fokus-Slots."
          block
        >
          <p className="training-staff-env">
            Entwicklungs-Umfeld <strong>×{environment.toFixed(2)}</strong>
            <span className="training-staff-env-label"> · {staffEnvironmentLabel(environment)}</span>
          </p>
        </Hint>
      </header>

      <div className="training-staff-grid">
        {COACH_ROLES.map((role) => (
          <CoachRoleCard
            key={role}
            role={role}
            coach={staff[role]}
            season={season}
            week={week}
            masterSeed={masterSeed}
            cash={cash}
            onHire={onHire}
          />
        ))}
      </div>
    </section>
  );
}

function CoachRoleCard({
  role,
  coach,
  season,
  week,
  masterSeed,
  cash,
  onHire,
}: {
  role: CoachRole;
  coach: Coach | null;
  season: number;
  week: number;
  masterSeed: number;
  cash: number;
  onHire: (coach: Coach) => void;
}) {
  const candidates = useMemo(
    () => coachCandidates(role, season, week, masterSeed),
    [role, season, week, masterSeed],
  );

  return (
    <article className="training-staff-card">
      <header className="training-staff-card-head">
        <h2>{COACH_ROLE_ICONS[role]} {COACH_ROLE_LABELS[role]}</h2>
      </header>

      {coach ? (
        <div className="training-staff-current">
          <p className="training-staff-name">{coach.name}</p>
          <p className="training-staff-meta">
            Qualität {coach.quality} · Umfeld ×{coachEnvironmentFactor(coach.quality).toFixed(2)}
          </p>
          <p className="training-staff-meta">
            {formatClubCash(coach.wage_weekly)}/Woche · bis Saison {coach.contract_until_season}
          </p>
        </div>
      ) : (
        <p className="training-staff-empty">Kein Trainer — Umfeld ×1.00</p>
      )}

      <div className="training-staff-market">
        <p className="training-staff-market-label">Kandidaten</p>
        <ul className="training-staff-candidates">
          {candidates.map((candidate) => {
            const affordable = cash >= candidate.wage_weekly * 2;
            const upgrade = !coach || candidate.quality > coach.quality;
            return (
              <li key={candidate.id}>
                <div className="training-staff-candidate">
                  <span>
                    <strong>{candidate.name}</strong>
                    <small>
                      Q{candidate.quality} · ×{coachEnvironmentFactor(candidate.quality).toFixed(2)} ·{" "}
                      {formatClubCash(candidate.wage_weekly)}/Wo
                    </small>
                  </span>
                  <button
                    type="button"
                    className="training-staff-hire"
                    disabled={!affordable || !upgrade}
                    title={
                      !upgrade
                        ? "Kandidat ist nicht besser als der aktuelle Trainer."
                        : !affordable
                          ? "Mindestens zwei Wochengehälter Cash nötig."
                          : "Trainer einstellen"
                    }
                    onClick={() => onHire(candidate)}
                  >
                    Einstellen
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
}
