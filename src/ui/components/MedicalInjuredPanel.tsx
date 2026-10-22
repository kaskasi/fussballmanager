import { useMemo, useState } from "react";
import { Stethoscope, Scissors, HeartPulse } from "lucide-react";
import type { Player } from "../../types/player.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import type { ClubMedicalState, PendingDiagnosis } from "../../medical/diagnosis-queue.ts";
import {
  diagnosisRevealLabel,
  physioAutoSlotsPerWeek,
  physioManualPlayerIds,
  physioManualOutcomeForPlayer,
} from "../../medical/injury-care.ts";
import { injuryTypeLabel } from "../../development/injury-roll.ts";
import { symptomPresentation } from "../../medical/medical-symptoms.ts";
import { PlayerPortrait } from "./PlayerPortrait.tsx";
import { MedicalPhysioTreatModal } from "./MedicalPhysioTreatModal.tsx";
import { useT } from "../../i18n/react.ts";

export function MedicalInjuredPanel({
  players,
  clubId,
  medicalState,
  medicalCenterLevel,
  season,
  week,
  onSelectPlayer,
  onDoctorExam,
  onSurgery,
  onPhysioManual,
  masterSeed,
}: {
  players: readonly Player[];
  clubId: string;
  medicalState: ClubMedicalState;
  medicalCenterLevel: number;
  season: number;
  week: number;
  onSelectPlayer: (playerId: string) => void;
  onDoctorExam: (playerId: string) => void;
  onSurgery: (playerId: string) => void;
  onPhysioManual: (playerId: string, success: boolean) => void;
  masterSeed: number;
}) {
  const t = useT();
  const [physioTarget, setPhysioTarget] = useState<{ player: Player; region: NonNullable<PendingDiagnosis["body_region"]> } | null>(null);

  const proPlayers = useMemo(
    () => players.filter((p) => p.club_id === clubId && p.squad_status === "pro"),
    [players, clubId],
  );

  const byId = useMemo(() => new Map(proPlayers.map((p) => [p.id, p])), [proPlayers]);

  const waiting = useMemo(
    () =>
      medicalState.pending_diagnoses
        .filter((row) => row.phase === "waiting_praxis" || (row.phase === "ready_doctor" || row.doctor_ready))
        .map((row) => ({ row, player: byId.get(row.player_id) }))
        .filter((entry): entry is { row: PendingDiagnosis; player: Player } => Boolean(entry.player)),
    [byId, medicalState.pending_diagnoses],
  );

  const surgeryQueue = useMemo(
    () =>
      medicalState.pending_diagnoses
        .filter((row) => row.phase === "awaiting_surgery" || row.phase === "external_surgery")
        .map((row) => ({ row, player: byId.get(row.player_id) }))
        .filter((entry): entry is { row: PendingDiagnosis; player: Player } => Boolean(entry.player)),
    [byId, medicalState.pending_diagnoses],
  );

  const rehab = useMemo(() => proPlayers.filter((p) => p.state.injury), [proPlayers]);

  const manualPhysioIds = physioManualPlayerIds(medicalState, players, season, week, medicalCenterLevel);
  const autoSlots = physioAutoSlotsPerWeek(medicalCenterLevel);

  return (
    <div className="medical-injured-panel">
      {waiting.length > 0 ? (
        <section className="medical-injured-section">
          <h3 className="medical-section-title">
            <Stethoscope size={16} aria-hidden /> {t("medical.injured.waitingRoom")}
          </h3>
          <ul className="medical-case-list">
            {waiting.map(({ row, player }) => {
              const ready = row.phase === "ready_doctor" || row.doctor_ready;
              return (
                <li key={player.id} className="medical-case-row">
                  <PlayerPortrait seed={player.portrait_seed} nationality={player.nationality} clubId={player.club_id} size="sm" />
                  <div className="medical-case-copy">
                    <button type="button" className="medical-case-name" onClick={() => onSelectPlayer(player.id)}>
                      {formatPlayerName(player)}
                    </button>
                    <p className="medical-case-symptom">{t(row.symptom_key ?? "medical.symptom.genericPain")}</p>
                    {!ready ? (
                      <span className="medical-muted">{t("medical.injured.praxisWait", { days: row.days_remaining })}</span>
                    ) : null}
                  </div>
                  {ready ? (
                    <button type="button" className="ui-btn ui-btn--sm" onClick={() => onDoctorExam(player.id)}>
                      {t("medical.injured.doctorExam")}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {surgeryQueue.length > 0 ? (
        <section className="medical-injured-section">
          <h3 className="medical-section-title">
            <Scissors size={16} aria-hidden /> {t("medical.injured.surgery")}
          </h3>
          <ul className="medical-case-list">
            {surgeryQueue.map(({ row, player }) => (
              <li key={player.id} className="medical-case-row">
                <PlayerPortrait seed={player.portrait_seed} nationality={player.nationality} clubId={player.club_id} size="sm" />
                <div className="medical-case-copy">
                  <strong>{formatPlayerName(player)}</strong>
                  <p>{diagnosisRevealLabel(row)}</p>
                  {row.phase === "external_surgery" ? (
                    <span className="medical-muted">
                      {t("medical.injured.externalOp", { weeks: row.surgery_weeks_remaining ?? 1 })}
                    </span>
                  ) : (
                    <button type="button" className="ui-btn ui-btn--sm" onClick={() => onSurgery(player.id)}>
                      {t("medical.injured.opInHouse")}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="medical-injured-section">
        <h3 className="medical-section-title">
          <HeartPulse size={16} aria-hidden /> {t("medical.injured.rehabSection")}
        </h3>
        <p className="medical-muted">
          {t("medical.physio.autoCapacity", { auto: autoSlots, total: rehab.length })}
        </p>
        {rehab.length === 0 && waiting.length === 0 && surgeryQueue.length === 0 ? (
          <p className="hub-inbox-empty">{t("medical.injured.none")}</p>
        ) : (
          <ul className="medical-case-list">
            {rehab.map((player) => {
              const injury = player.state.injury!;
              const needsManual = manualPhysioIds.includes(player.id);
              const manualOutcome = physioManualOutcomeForPlayer(
                medicalState,
                season,
                week,
                player.id,
              );
              const region = symptomPresentation(injury.type_id, player.id, masterSeed).body_region;
              return (
                <li key={player.id} className="medical-case-row">
                  <PlayerPortrait seed={player.portrait_seed} nationality={player.nationality} clubId={player.club_id} size="sm" />
                  <div className="medical-case-copy">
                    <button type="button" className="medical-case-name" onClick={() => onSelectPlayer(player.id)}>
                      {formatPlayerName(player)}
                    </button>
                    <span className="medical-muted">
                      {injuryTypeLabel(injury.type_id)} · {t("medical.injured.weeksLeft", { weeks: injury.weeks_remaining })}
                    </span>
                  </div>
                  {needsManual ? (
                    <button
                      type="button"
                      className="ui-btn ui-btn--sm ui-btn--ghost"
                      onClick={() => setPhysioTarget({ player, region })}
                    >
                      {t("medical.physio.help")}
                    </button>
                  ) : manualOutcome ? (
                    <span
                      className={
                        manualOutcome === "success"
                          ? "medical-physio-result is-success"
                          : "medical-physio-result is-fail"
                      }
                    >
                      {manualOutcome === "success"
                        ? t("medical.physio.resultSuccess")
                        : t("medical.physio.resultFail")}
                    </span>
                  ) : (
                    <span className="medical-tag-auto">{t("medical.physio.auto")}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {physioTarget ? (
        <MedicalPhysioTreatModal
          player={physioTarget.player}
          targetRegion={physioTarget.region}
          season={season}
          week={week}
          masterSeed={masterSeed}
          medicalState={medicalState}
          onPhysioComplete={(success) => {
            onPhysioManual(physioTarget.player.id, success);
            setPhysioTarget(null);
          }}
          onClose={() => setPhysioTarget(null)}
        />
      ) : null}
    </div>
  );
}
