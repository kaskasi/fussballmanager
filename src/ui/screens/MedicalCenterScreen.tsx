/**
 * WIREFRAME: docs/prd/design.md §9.16 — Medizin (Staff / Verletzte / Ermüdung)
 */
import { useMemo, useState, useCallback } from "react";
import { HeartPulse, Users, Activity } from "lucide-react";
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
  onPhysioManual: (playerId: string) => void;
}) {
  const t = useT();
  const [tab, setTab] = useState<MedicalTab>("staff");
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

  return (
    <main className="medical-screen club-shell-card-body">
      <div className="fm-tab-bar" role="tablist" aria-label={t("medical.tab.aria")}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "fm-tab is-active" : "fm-tab"}
            onClick={() => setTab(id)}
          >
            <Icon size={16} strokeWidth={2.2} aria-hidden /> {label}
            {id === "injured" && (injured.length + pending.length) > 0 ? (
              <span className="medical-tab-badge">{injured.length + pending.length}</span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "staff" ? (
        <div className="fm-tab-panel">
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
        <div className="fm-tab-panel">
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
        <div className="fm-tab-panel">
          <FitnessManagementPanel
            players={players}
            clubId={clubId}
            intensity={trainingIntensity}
            injuryRiskFactor={injuryRiskFactor}
          />
          <div className="medical-rehab-picker">
            <label className="medical-rehab-label" htmlFor="medical-rehab-player">
              {t("medical.rehab.pickPlayer")}
            </label>
            <select
              id="medical-rehab-player"
              className="ui-select"
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
          </div>
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
