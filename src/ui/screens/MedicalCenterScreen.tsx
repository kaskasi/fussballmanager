/**
 * WIREFRAME: docs/prd/design.md §9.16 — Medizin (Staff / Verletzte / Ermüdung)
 */
import { useMemo, useState, useCallback } from "react";
import { HeartPulse, Users, Activity } from "lucide-react";
import { isPlayerTired } from "../../development/fitness-management.ts";
import { formatClubCashWeekly } from "../../economy/club-finances.ts";
import { medicalStaffWageBill } from "../../staff/medical-staff.ts";
import type { Player } from "../../types/player.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import type { ClubStadium } from "../../stadium/club-stadium.ts";
import type { MedicalStaff, MedicalMember } from "../../staff/medical-staff.ts";
import type { ClubMedicalState } from "../../medical/diagnosis-queue.ts";
import type { OrthopedistHireState } from "../../medical/orthopedist-hire.ts";
import { MedicalStaffPanel } from "../components/MedicalStaffPanel.tsx";
import { FitnessManagementPanel } from "../components/FitnessManagementPanel.tsx";
import { RehabMinigamePanel } from "../components/RehabMinigamePanel.tsx";
import { OrthopedistInboxCard } from "../components/OrthopedistInboxCard.tsx";
import { orthopedistAwaitingPostfach } from "../../medical/orthopedist-hire.ts";
import { useT } from "../../i18n/react.ts";
import { MedicalInjuredPanel } from "../components/MedicalInjuredPanel.tsx";
import { MedicalDoctorExamModal } from "../components/MedicalDoctorExamModal.tsx";
import { precinctMedicalCenterLevel } from "../../stadium/precinct-effects.ts";
import { COACH_TARGET } from "../../tutorial/tutorial-targets.ts";
import { useTutorialTabFocus } from "../tutorial/use-tutorial-tab-focus.ts";

type MedicalTab = "staff" | "injured" | "practice";

export function MedicalCenterScreen({
  players,
  clubId,
  stadium,
  season,
  week,
  masterSeed,
  cash,
  medicalStaff,
  medicalState,
  orthopedistHire,
  trainingIntensity,
  injuryRiskFactor,
  onSelectPlayer,
  onHireDoctor,
  onHirePhysio,
  onHireOrthopedist,
  onRehabMinigameComplete,
  onDoctorExamComplete,
  onSurgery,
  onPhysioManual,
}: {
  players: readonly Player[];
  clubId: string;
  stadium: ClubStadium;
  season: number;
  week: number;
  masterSeed: number;
  cash: number;
  medicalStaff: MedicalStaff;
  medicalState: ClubMedicalState;
  orthopedistHire: OrthopedistHireState;
  trainingIntensity: number;
  injuryRiskFactor: number;
  onSelectPlayer: (playerId: string) => void;
  onHireDoctor: (member: MedicalMember) => void;
  onHirePhysio: (member: MedicalMember) => void;
  onHireOrthopedist: (candidate: import("../../medical/orthopedist-hire.ts").OrthopedistCandidate) => void;
  onRehabMinigameComplete: (playerId: string, success: boolean) => void;
  onDoctorExamComplete: (playerId: string) => void;
  onSurgery: (playerId: string) => void;
  onPhysioManual: (playerId: string, success: boolean) => void;
}) {
  const t = useT();
  const [tab, setTab] = useState<MedicalTab>("staff");
  useTutorialTabFocus("medical", "medical.fitness_risk", "practice", setTab);
  const [rehabPlayerId, setRehabPlayerId] = useState<string | null>(null);
  const [examPlayerId, setExamPlayerId] = useState<string | null>(null);

  const openDoctorExam = useCallback((playerId: string) => {
    setExamPlayerId(playerId);
  }, []);

  const proPlayers = useMemo(
    () => players.filter((p) => p.club_id === clubId && p.squad_status === "pro"),
    [players, clubId],
  );

  const medicalCenterLevel = precinctMedicalCenterLevel(stadium.precinct);

  const injured = useMemo(
    () => proPlayers.filter((p) => p.state.injury !== null),
    [proPlayers],
  );

  const pending = useMemo(
    () => medicalState.pending_diagnoses,
    [medicalState.pending_diagnoses],
  );

  const rehabPlayer = rehabPlayerId
    ? proPlayers.find((p) => p.id === rehabPlayerId) ?? null
    : null;

  const examPlayer = examPlayerId ? proPlayers.find((p) => p.id === examPlayerId) ?? null : null;
  const examPending = examPlayerId
    ? medicalState.pending_diagnoses.find((row) => row.player_id === examPlayerId)
    : undefined;

  const orthoReady = orthopedistAwaitingPostfach(orthopedistHire, Boolean(medicalStaff.orthopedist));

  const tabs: { id: MedicalTab; label: string; icon: typeof HeartPulse }[] = [
    { id: "staff", label: t("medical.tab.staff"), icon: Users },
    { id: "injured", label: t("medical.tab.injured"), icon: HeartPulse },
    { id: "practice", label: t("medical.tab.practice"), icon: Activity },
  ];

  const tiredCount = proPlayers.filter((p) => p.state.injury === null && isPlayerTired(p)).length;
  const avgFitness =
    proPlayers.length > 0
      ? Math.round(proPlayers.reduce((sum, p) => sum + p.state.fitness, 0) / proPlayers.length)
      : 0;
  const stats: { id: string; label: string; value: string; tone?: "good" | "mid" | "low" }[] = [
    { id: "injured", label: t("medical.stat.injured"), value: String(injured.length), tone: injured.length > 0 ? "low" : "good" },
    { id: "waiting", label: t("medical.stat.waiting"), value: String(pending.length), tone: pending.length > 0 ? "mid" : undefined },
    { id: "tired", label: t("medical.stat.tired"), value: String(tiredCount), tone: tiredCount > 0 ? "mid" : undefined },
    { id: "fitness", label: t("medical.stat.avgFitness"), value: String(avgFitness), tone: avgFitness >= 75 ? "good" : avgFitness >= 50 ? "mid" : "low" },
  ];

  return (
    <main className="medical-screen club-shell-card-body">
      <header className="tc-page-head">
        <span className="tc-label">{t("medical.page.eyebrow")}</span>
        <h1 className="tc-page-title">{t("medical.page.title")}</h1>
        <p className="tc-page-sub">
          {medicalCenterLevel > 0
            ? `${t("medical.staff.buildingLevel", { level: medicalCenterLevel })} · ${t("medical.staff.wageBill", {
                amount: formatClubCashWeekly(medicalStaffWageBill(medicalStaff)),
              })}`
            : t("medical.page.noBuilding")}
        </p>
      </header>

      <dl className="tc-stats tc-medical__stats" aria-label={t("medical.stat.aria")}>
        {stats.map((stat) => (
          <div key={stat.id} className="tc-stats__item">
            <dt className="tc-label">{stat.label}</dt>
            <dd>
              <span className={stat.tone ? `tc-stat__value tc-state--${stat.tone}` : "tc-stat__value"}>{stat.value}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div
        className="tc-tabs tc-tabs--page"
        role="tablist"
        aria-label={t("medical.tab.aria")}
        data-coach-target={COACH_TARGET.medicalTabs}
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            className="tc-tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            <Icon className="tc-icon" aria-hidden /> {label}
            {id === "injured" && (injured.length + pending.length) > 0 ? (
              <span className="tc-tab__meta">{injured.length + pending.length}</span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "staff" ? (
        <div className="tc-stack">
          <MedicalStaffPanel
            staff={medicalStaff}
            stadium={stadium}
            season={season}
            week={week}
            masterSeed={masterSeed}
            cash={cash}
            onHireDoctor={onHireDoctor}
            onHirePhysio={onHirePhysio}
            orthopedistSlot={
              orthoReady ? (
                <OrthopedistInboxCard
                  masterSeed={masterSeed}
                  season={season}
                  week={week}
                  onHire={onHireOrthopedist}
                />
              ) : undefined
            }
          />
        </div>
      ) : null}

      {tab === "injured" ? (
        <div className="tc-stack">
          <MedicalInjuredPanel
            players={players}
            clubId={clubId}
            medicalState={medicalState}
            medicalCenterLevel={medicalCenterLevel}
            season={season}
            week={week}
            onSelectPlayer={onSelectPlayer}
            onDoctorExam={openDoctorExam}
            onSurgery={onSurgery}
            onPhysioManual={onPhysioManual}
            masterSeed={masterSeed}
          />
          {examPlayer && examPending ? (
            <MedicalDoctorExamModal
              player={examPlayer}
              pending={examPending}
              onClose={() => setExamPlayerId(null)}
              onConfirm={() => {
                onDoctorExamComplete(examPlayer.id);
                setExamPlayerId(null);
              }}
            />
          ) : null}
        </div>
      ) : null}

      {tab === "practice" ? (
        <div className="tc-stack" data-coach-target={COACH_TARGET.medicalFitness}>
          <FitnessManagementPanel
            players={players}
            clubId={clubId}
            intensity={trainingIntensity}
            injuryRiskFactor={injuryRiskFactor}
          />
          <section className="tc-panel tc-medical__rehab" aria-label={t("medical.rehab.aria")}>
            <h2 className="tc-panel__title">{t("medical.rehab.sectionTitle")}</h2>
            <p className="tc-caption">{t("medical.rehab.sectionHint")}</p>
            {injured.length === 0 ? (
              <p className="tc-empty">{t("medical.rehab.noneInjured")}</p>
            ) : (
              <label className="tc-medical__field">
                <span className="tc-label">{t("medical.rehab.pickPlayer")}</span>
                <select
                  id="medical-rehab-player"
                  className="tc-select"
                  value={rehabPlayerId ?? ""}
                  onChange={(event) => setRehabPlayerId(event.target.value || null)}
                >
                  <option value="">{t("medical.rehab.pickPlaceholder")}</option>
                  {injured.map((player) => (
                    <option key={player.id} value={player.id}>
                      {formatPlayerName(player)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </section>
          {rehabPlayer ? (
            <RehabMinigamePanel
              playerId={rehabPlayer.id}
              playerName={formatPlayerName(rehabPlayer)}
              season={season}
              week={week}
              masterSeed={masterSeed}
              medicalState={medicalState}
              onComplete={(success) => onRehabMinigameComplete(rehabPlayer.id, success)}
            />
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
