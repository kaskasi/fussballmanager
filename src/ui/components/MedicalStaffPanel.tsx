import { useMemo } from "react";
import { Award, Stethoscope, UserRound } from "lucide-react";
import { formatClubCashWeekly } from "../../economy/club-finances.ts";
import {
  hasLegendaryMedicalHired,
  medicalCandidates,
  medicalSlotCaps,
  medicalStaffWageBill,
  type MedicalMember,
  type MedicalStaff,
} from "../../staff/medical-staff.ts";
import { precinctMedicalCenterLevel } from "../../stadium/precinct-effects.ts";
import type { ClubStadium } from "../../stadium/club-stadium.ts";
import { PlayerPortrait } from "./PlayerPortrait.tsx";
import { formatSeasonLabel } from "../../sim/season-label.ts";
import { useT } from "../../i18n/react.ts";

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
  orthopedistSlot?: React.ReactNode;
  onOpenOrthopedistHire?: () => void;
}) {
  const t = useT();
  const level = precinctMedicalCenterLevel(stadium.precinct);
  const caps = medicalSlotCaps(level);
  const wageBill = medicalStaffWageBill(staff);
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
      <p className="hub-inbox-empty">{t("medical.staff.needBuilding")}</p>
    );
  }

  return (
    <section className="training-staff medical-staff-panel" aria-label={t("medical.staff.aria")}>
      <header className="training-staff-head">
        <p className="training-staff-env">
          {t("medical.staff.buildingLevel", { level })}{" "}
          <span className="training-staff-env-label">
            · {t("medical.staff.wageBill", { amount: formatClubCashWeekly(wageBill) })}
          </span>
        </p>
      </header>

      <MedicalRoleBlock
        title={t("medical.role.doctor")}
        icon={Stethoscope}
        member={staff.doctor}
        candidates={doctorCandidates}
        cash={cash}
        onHire={onHireDoctor}
      />

      <div className="medical-physio-block">
        <h3 className="merch-section-title">
          {t("medical.role.physios")} ({staff.physios.length}/{caps.physios})
        </h3>
        <ul className="medical-physio-list">
          {staff.physios.map((p) => (
            <li key={p.id}>
              <MemberRow member={p} />
            </li>
          ))}
        </ul>
        {staff.physios.length < caps.physios ? (
          <CandidateList candidates={physioCandidates} cash={cash} onHire={onHirePhysio} />
        ) : null}
      </div>

      {caps.orthopedist > 0 ? (
        <div className="medical-ortho-block">
          <h3 className="merch-section-title">{t("medical.role.orthopedist")}</h3>
          {staff.orthopedist ? (
            <MemberRow member={staff.orthopedist} />
          ) : orthopedistSlot ? (
            orthopedistSlot
          ) : onOpenOrthopedistHire ? (
            <button type="button" className="ui-btn ui-btn--ghost" onClick={onOpenOrthopedistHire}>
              {t("medical.ortho.startSearch")}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function MedicalRoleBlock({
  title,
  icon: Icon,
  member,
  candidates,
  cash,
  onHire,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  member: MedicalMember | null;
  candidates: MedicalMember[];
  cash: number;
  onHire: (m: MedicalMember) => void;
}) {
  return (
    <div className="medical-role-block">
      <h3 className="merch-section-title">
        <Icon size={18} strokeWidth={2.2} aria-hidden /> {title}
      </h3>
      {member ? <MemberRow member={member} /> : <CandidateList candidates={candidates} cash={cash} onHire={onHire} />}
    </div>
  );
}

function MemberRow({ member }: { member: MedicalMember }) {
  const t = useT();
  return (
    <div className="medical-member-row">
      <PlayerPortrait seed={member.portrait_seed} size="sm" />
      <div>
        <strong>
          {member.name}
          {member.legendary_id ? (
            <span className="medical-legend-badge" title={t("medical.legend.badge")}>
              <Award size={14} aria-hidden />
            </span>
          ) : null}
        </strong>
        <span className="medical-member-meta">
          Q{member.quality} · {formatClubCashWeekly(member.wage_weekly)} ·{" "}
          {formatSeasonLabel(member.contract_until_season)}
        </span>
      </div>
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
    return <p className="medical-muted">{t("medical.staff.noCandidates")}</p>;
  }
  return (
    <ul className="medical-candidate-list">
      {candidates.map((candidate) => (
        <li key={candidate.id} className="medical-candidate-row">
          <UserRound size={16} aria-hidden />
          <span>
            {candidate.name}
            {candidate.legendary_id ? ` · ${t("medical.legend.badge")}` : ""} · Q{candidate.quality}
          </span>
          <button
            type="button"
            className="ui-btn ui-btn--sm"
            disabled={cash < candidate.wage_weekly * 4}
            onClick={() => onHire(candidate)}
          >
            {t("medical.staff.hire")}
          </button>
        </li>
      ))}
    </ul>
  );
}
