/** WIREFRAME: design.md §9.16 — Medizin · Staff: one card per role, candidates below the holder. */
import { useMemo, type ComponentType, type ReactNode } from "react";
import { Award, Bone, Building2, HandHeart, Stethoscope } from "lucide-react";
import { formatClubCashWeekly } from "../../economy/club-finances.ts";
import {
  hasLegendaryMedicalHired,
  MAX_PHYSIOS,
  medicalCandidates,
  medicalSlotCaps,
  type MedicalMember,
  type MedicalStaff,
} from "../../staff/medical-staff.ts";
import { precinctMedicalCenterLevel } from "../../stadium/precinct-effects.ts";
import type { ClubStadium } from "../../stadium/club-stadium.ts";
import { PlayerPortrait } from "./PlayerPortrait.tsx";
import { formatSeasonLabel } from "../../sim/season-label.ts";
import { useT } from "../../i18n/react.ts";

/** Weeks of wages the club must hold in cash to hire. */
const HIRE_CASH_WEEKS = 4;

export function MedicalStaffPanel({
  staff,
  stadium,
  season,
  week,
  masterSeed,
  cash,
  onHireDoctor,
  onHirePhysio,
  orthopedistSlot,
  onOpenOrthopedistHire,
}: {
  staff: MedicalStaff;
  stadium: ClubStadium;
  season: number;
  week: number;
  masterSeed: number;
  cash: number;
  onHireDoctor: (member: MedicalMember) => void;
  onHirePhysio: (member: MedicalMember) => void;
  orthopedistSlot?: ReactNode;
  onOpenOrthopedistHire?: () => void;
}) {
  const t = useT();
  const level = precinctMedicalCenterLevel(stadium.precinct);
  const caps = medicalSlotCaps(level);
  const legendaryHired = hasLegendaryMedicalHired(staff);

  const doctorCandidates = useMemo(
    () => (caps.doctor > 0 && !staff.doctor ? medicalCandidates("doctor", season, week, masterSeed, legendaryHired) : []),
    [caps.doctor, staff.doctor, season, week, masterSeed, legendaryHired],
  );
  const physioCandidates = useMemo(
    () =>
      caps.physios > staff.physios.length
        ? medicalCandidates("physio", season, week, masterSeed, legendaryHired)
        : [],
    [caps.physios, staff.physios.length, season, week, masterSeed, legendaryHired],
  );

  if (level <= 0) {
    return (
      <section className="tc-panel" aria-label={t("medical.staff.aria")}>
        <div className="tc-empty-state">
          <Building2 className="tc-icon" aria-hidden />
          <p className="tc-empty-state__title">{t("medical.staff.noBuildingTitle")}</p>
          <p>{t("medical.staff.needBuilding")}</p>
        </div>
        <LevelLadder level={0} />
      </section>
    );
  }

  return (
    <section className="tc-stack" aria-label={t("medical.staff.aria")}>
      <div className="tc-cards">
        <RoleCard icon={Stethoscope} title={t("medical.role.doctor")} meta={`${staff.doctor ? 1 : 0}/${caps.doctor}`}>
          {staff.doctor ? (
            <MemberRow member={staff.doctor} />
          ) : (
            <CandidateList candidates={doctorCandidates} cash={cash} onHire={onHireDoctor} />
          )}
        </RoleCard>

        <RoleCard
          icon={HandHeart}
          title={t("medical.role.physios")}
          meta={`${staff.physios.length}/${caps.physios}`}
        >
          {staff.physios.length > 0 ? (
            <ul className="tc-list">
              {staff.physios.map((member) => (
                <li key={member.id}>
                  <MemberRow member={member} />
                </li>
              ))}
            </ul>
          ) : null}
          {staff.physios.length < caps.physios ? (
            <CandidateList candidates={physioCandidates} cash={cash} onHire={onHirePhysio} />
          ) : null}
        </RoleCard>

        <RoleCard
          icon={Bone}
          title={t("medical.role.orthopedist")}
          meta={`${staff.orthopedist ? 1 : 0}/${caps.orthopedist}`}
        >
          {caps.orthopedist <= 0 ? (
            <p className="tc-empty">{t("medical.staff.orthoLocked")}</p>
          ) : staff.orthopedist ? (
            <MemberRow member={staff.orthopedist} />
          ) : orthopedistSlot ? (
            orthopedistSlot
          ) : onOpenOrthopedistHire ? (
            <button type="button" className="tc-btn tc-btn--sm" onClick={onOpenOrthopedistHire}>
              {t("medical.ortho.startSearch")}
            </button>
          ) : (
            <p className="tc-empty">{t("medical.ortho.startSearch")}</p>
          )}
        </RoleCard>
      </div>
      {level < 3 ? (
        <section className="tc-panel">
          <LevelLadder level={level} />
        </section>
      ) : null}
    </section>
  );
}

/** What each Medical Center level unlocks; the current level is marked. */
function LevelLadder({ level }: { level: number }) {
  const t = useT();
  const rows = [
    { level: 1, text: t("medical.ladder.level1") },
    { level: 2, text: t("medical.ladder.level2") },
    { level: 3, text: t("medical.ladder.level3", { physios: MAX_PHYSIOS }) },
  ];
  return (
    <div className="tc-medical__ladder">
      <h3 className="tc-label">{t("medical.ladder.title")}</h3>
      <dl className="tc-kv">
        {rows.map((row) => (
          <div key={row.level} className={row.level === level ? "tc-medical__ladder-row is-current" : "tc-medical__ladder-row"}>
            <dt>{t("medical.ladder.levelLabel", { level: row.level })}</dt>
            <dd className={row.level <= level ? "tc-ok" : undefined}>{row.text}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function RoleCard({
  icon: Icon,
  title,
  meta,
  children,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  meta: string;
  children: ReactNode;
}) {
  return (
    <article className="tc-card tc-panel tc-medical__role">
      <h3 className="tc-card__title">
        <Icon className="tc-icon" aria-hidden /> {title}
        <span className="tc-medical__slots">{meta}</span>
      </h3>
      {children}
    </article>
  );
}

function MemberRow({ member }: { member: MedicalMember }) {
  const t = useT();
  return (
    <div className="tc-medical__member">
      <PlayerPortrait seed={member.portrait_seed} pool="mixed" size="sm" />
      <span className="tc-list__main">
        <span className="tc-list__name">
          {member.name}
          {member.legendary_id ? (
            <span className="tc-medical__legend" title={t("medical.legend.badge")}>
              <Award className="tc-icon" aria-label={t("medical.legend.badge")} />
            </span>
          ) : null}
        </span>
        <span className="tc-list__meta">
          {formatClubCashWeekly(member.wage_weekly)} · {t("medical.staff.contractUntil", { season: formatSeasonLabel(member.contract_until_season) })}
        </span>
      </span>
      <span className="tc-list__value" title={t("medical.staff.qualityTitle")}>
        {member.quality}
      </span>
    </div>
  );
}

function CandidateList({
  candidates,
  cash,
  onHire,
}: {
  candidates: MedicalMember[];
  cash: number;
  onHire: (m: MedicalMember) => void;
}) {
  const t = useT();
  if (candidates.length === 0) {
    return <p className="tc-empty">{t("medical.staff.noCandidates")}</p>;
  }
  return (
    <div className="tc-medical__candidates">
      <span className="tc-label">{t("medical.staff.candidates")}</span>
      <ul className="tc-list">
        {candidates.map((candidate) => {
          const short = cash < candidate.wage_weekly * HIRE_CASH_WEEKS;
          return (
            <li key={candidate.id} className="tc-list__item tc-list__item--wide">
              <span className="tc-list__main">
                <span className="tc-list__name">
                  {candidate.name}
                  {candidate.legendary_id ? ` · ${t("medical.legend.badge")}` : ""}
                </span>
                <span className="tc-list__meta">
                  {t("medical.staff.quality", { quality: candidate.quality })} · {formatClubCashWeekly(candidate.wage_weekly)}
                </span>
              </span>
              <button
                type="button"
                className="tc-btn tc-btn--sm"
                disabled={short}
                title={short ? t("medical.event.insufficientCash") : undefined}
                onClick={() => onHire(candidate)}
              >
                {t("medical.staff.hire")}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
