import { useMemo } from "react";
import { Dumbbell, Shield, Swords, type LucideIcon } from "lucide-react";
import { formatClubCash, formatClubCashWeekly } from "../../economy/club-finances.ts";
import {
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
import { formatSeasonLabel } from "../../sim/season-label.ts";
import { PlayerPortrait } from "./PlayerPortrait.tsx";

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

const COACH_ROLE_TAB_ICONS: Record<CoachRole, LucideIcon> = {
  attack: Swords,
  defense: Shield,
  fitness: Dumbbell,
};

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
        <h2 className="training-staff-role-title">
          {(() => {
            const Icon = COACH_ROLE_TAB_ICONS[role];
            return <Icon size={18} strokeWidth={2.5} aria-hidden="true" />;
          })()}{" "}
          {COACH_ROLE_LABELS[role]}
        </h2>
      </header>

      {coach ? (
        <div className="training-staff-current">
          <div className="training-staff-identity">
            <PlayerPortrait seed={coach.portrait_seed} size="sm" pool="mixed" className="training-staff-portrait" />
            <p className="training-staff-name">{coach.name}</p>
          </div>
          <p className="training-staff-meta">
            Qualität {coach.quality} · Umfeld ×{coachEnvironmentFactor(coach.quality).toFixed(2)}
          </p>
          <p className="training-staff-meta">
            {formatClubCashWeekly(coach.wage_weekly)} · bis {formatSeasonLabel(coach.contract_until_season)}
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
                  <PlayerPortrait seed={candidate.portrait_seed} size="sm" pool="mixed" className="training-staff-portrait" />
                  <span>
                    <strong>{candidate.name}</strong>
                    <small>
                      Q{candidate.quality} · ×{coachEnvironmentFactor(candidate.quality).toFixed(2)} ·{" "}
                      {formatClubCashWeekly(candidate.wage_weekly)}
                    </small>
                  </span>
                  <button
                    type="button"
                    className="ui-btn ui-btn--primary"
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
