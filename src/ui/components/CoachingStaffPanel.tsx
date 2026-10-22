import { useMemo } from "react";
import { Dumbbell, Shield, Swords, type LucideIcon } from "lucide-react";
import { formatClubCash } from "../../economy/club-finances.ts";
import {
  COACH_ROLES,
  coachCandidates,
  coachEnvironmentFactor,
  environmentFromCoachingStaff,
  staffEnvironmentTier,
  type Coach,
  type CoachRole,
  type CoachingStaff,
} from "../../staff/coaching-staff.ts";
import { formatSeasonLabel } from "../../sim/season-label.ts";
import { useT } from "../../i18n/react.ts";
import { PlayerPortrait } from "./PlayerPortrait.tsx";

/**
 * WIREFRAME: PRD 09 — F8.1 Trainerstab, on tc components (design.md §4.3, §9.11):
 * environment summary, then one card per role with the current coach and three candidates.
 */

const COACH_ROLE_ICONS: Record<CoachRole, LucideIcon> = {
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
  const t = useT();
  const environment = environmentFromCoachingStaff(staff);

  return (
    <section className="tc-panel" aria-labelledby="squad-coaches-title">
      <div className="tc-panel__head">
        <h2 className="tc-panel__title" id="squad-coaches-title">
          {t("staff.coaches.title")}
        </h2>
        <span className="tc-panel__meta">
          {t("staff.environment.summary", {
            factor: environment.toFixed(2),
            tier: t(`staff.environment.tier.${staffEnvironmentTier(environment)}`),
          })}
        </span>
      </div>
      <p className="tc-page-sub tc-section__title">{t("staff.coaches.lead")}</p>

      <div className="tc-cards">
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
      <p className="tc-caption tc-cards__note">{t("staff.coaches.hireRule")}</p>
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
  const t = useT();
  const candidates = useMemo(
    () => coachCandidates(role, season, week, masterSeed),
    [role, season, week, masterSeed],
  );
  const Icon = COACH_ROLE_ICONS[role];
  const titleId = `coach-role-${role}`;

  return (
    <article className="tc-card" aria-labelledby={titleId}>
      <h3 className="tc-label tc-card__title" id={titleId}>
        <Icon className="tc-icon" aria-hidden="true" />
        {t(`staff.role.${role}`)}
      </h3>

      {coach ? (
        <div className="tc-card__current">
          <span className="tc-namecell">
            <PlayerPortrait seed={coach.portrait_seed} size="sm" pool="mixed" />
            {coach.name}
          </span>
          <span className="tc-list__meta">
            {t("staff.coach.quality", {
              quality: coach.quality,
              factor: coachEnvironmentFactor(coach.quality).toFixed(2),
            })}
          </span>
          <span className="tc-list__meta">
            {t("staff.coach.contract", {
              wage: t("staff.perWeek", { amount: formatClubCash(coach.wage_weekly) }),
              season: formatSeasonLabel(coach.contract_until_season),
            })}
          </span>
        </div>
      ) : (
        <p className="tc-empty">{t("staff.coach.none")}</p>
      )}

      <p className="tc-label tc-card__subtitle">{t("staff.coach.candidates")}</p>
      <ul className="tc-list">
        {candidates.map((candidate) => {
          const affordable = cash >= candidate.wage_weekly * 2;
          const upgrade = !coach || candidate.quality > coach.quality;
          const reason = !upgrade
            ? t("staff.coach.notBetter")
            : !affordable
              ? t("staff.coach.needsCash")
              : undefined;
          return (
            <li key={candidate.id} className="tc-list__item tc-list__item--wide">
              <span className="tc-list__main">
                <span className="tc-namecell">
                  <PlayerPortrait seed={candidate.portrait_seed} size="sm" pool="mixed" />
                  {candidate.name}
                </span>
                <span className="tc-list__meta">
                  {t("staff.coach.candidateMeta", {
                    quality: candidate.quality,
                    factor: coachEnvironmentFactor(candidate.quality).toFixed(2),
                    wage: t("staff.perWeek", { amount: formatClubCash(candidate.wage_weekly) }),
                  })}
                </span>
                {reason ? <span className="tc-list__meta">{reason}</span> : null}
              </span>
              <button
                type="button"
                className="tc-btn tc-btn--primary tc-btn--sm"
                disabled={Boolean(reason)}
                aria-label={t("staff.coach.hireAria", { name: candidate.name })}
                onClick={() => onHire(candidate)}
              >
                {t("staff.coach.hire")}
              </button>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
