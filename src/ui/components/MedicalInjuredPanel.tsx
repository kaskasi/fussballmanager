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

  const nothing = rehab.length === 0 && waiting.length === 0 && surgeryQueue.length === 0;

  return (
    <div className="tc-stack tc-medical__injured">
      {nothing ? (
        <section className="tc-panel">
          <div className="tc-empty-state">
            <HeartPulse className="tc-icon" aria-hidden />
            <p className="tc-empty-state__title">{t("medical.injured.noneTitle")}</p>
            <p>{t("medical.injured.none")}</p>
          </div>
        </section>
      ) : null}

      {waiting.length > 0 ? (
        <section className="tc-panel" aria-label={t("medical.injured.waitingRoom")}>
          <h2 className="tc-card__title">
            <Stethoscope className="tc-icon" aria-hidden /> {t("medical.injured.waitingRoom")}
          </h2>
          <ul className="tc-list">
            {waiting.map(({ row, player }) => {
              const ready = row.phase === "ready_doctor" || row.doctor_ready;
              return (
                <li key={player.id} className="tc-medical__case">
                  <PlayerPortrait seed={player.portrait_seed} nationality={player.nationality} clubId={player.club_id} size="sm" />
                  <span className="tc-list__main">
                    <button type="button" className="tc-linkbtn" onClick={() => onSelectPlayer(player.id)}>
                      {formatPlayerName(player)}
                    </button>
                    <span className="tc-medical__quote">{t(row.symptom_key ?? "medical.symptom.genericPain")}</span>
                    {!ready ? (
                      <span className="tc-list__meta">{t("medical.injured.praxisWait", { days: row.days_remaining })}</span>
                    ) : null}
                  </span>
                  {ready ? (
                    <button type="button" className="tc-btn tc-btn--sm tc-btn--primary" onClick={() => onDoctorExam(player.id)}>
                      {t("medical.injured.doctorExam")}
                    </button>
                  ) : (
                    <span />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {surgeryQueue.length > 0 ? (
        <section className="tc-panel" aria-label={t("medical.injured.surgery")}>
          <h2 className="tc-card__title">
            <Scissors className="tc-icon" aria-hidden /> {t("medical.injured.surgery")}
          </h2>
          <ul className="tc-list">
            {surgeryQueue.map(({ row, player }) => (
              <li key={player.id} className="tc-medical__case">
                <PlayerPortrait seed={player.portrait_seed} nationality={player.nationality} clubId={player.club_id} size="sm" />
                <span className="tc-list__main">
                  <button type="button" className="tc-linkbtn" onClick={() => onSelectPlayer(player.id)}>
                    {formatPlayerName(player)}
                  </button>
                  <span className="tc-list__meta">{diagnosisRevealLabel(row)}</span>
                </span>
                {row.phase === "external_surgery" ? (
                  <span className="tc-caption">
                    {t("medical.injured.externalOp", { weeks: row.surgery_weeks_remaining ?? 1 })}
                  </span>
                ) : (
                  <button type="button" className="tc-btn tc-btn--sm tc-btn--primary" onClick={() => onSurgery(player.id)}>
                    {t("medical.injured.opInHouse")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {rehab.length > 0 ? (
        <section className="tc-panel" aria-label={t("medical.injured.rehabSection")}>
          <div className="tc-panel__head">
            <h2 className="tc-card__title">
              <HeartPulse className="tc-icon" aria-hidden /> {t("medical.injured.rehabSection")}
            </h2>
            <span className="tc-panel__meta">
              {t("medical.physio.autoCapacity", { auto: autoSlots, total: rehab.length })}
            </span>
          </div>
          <ul className="tc-list">
            {rehab.map((player) => {
              const injury = player.state.injury!;
              const needsManual = manualPhysioIds.includes(player.id);
              const manualOutcome = physioManualOutcomeForPlayer(medicalState, season, week, player.id);
              const region = symptomPresentation(injury.type_id, player.id, masterSeed).body_region;
              return (
                <li key={player.id} className="tc-medical__case">
                  <PlayerPortrait seed={player.portrait_seed} nationality={player.nationality} clubId={player.club_id} size="sm" />
                  <span className="tc-list__main">
                    <button type="button" className="tc-linkbtn" onClick={() => onSelectPlayer(player.id)}>
                      {formatPlayerName(player)}
                    </button>
                    <span className="tc-list__meta">
                      {injuryTypeLabel(injury.type_id)} · {t("medical.injured.weeksLeft", { weeks: injury.weeks_remaining })}
                    </span>
                  </span>
                  {needsManual ? (
                    <button type="button" className="tc-btn tc-btn--sm" onClick={() => setPhysioTarget({ player, region })}>
                      {t("medical.physio.help")}
                    </button>
                  ) : manualOutcome ? (
                    <span className={manualOutcome === "success" ? "tc-state tc-state--good" : "tc-state tc-state--low"}>
                      {manualOutcome === "success" ? t("medical.physio.resultSuccess") : t("medical.physio.resultFail")}
                    </span>
                  ) : (
                    <span className="tc-caption">{t("medical.physio.auto")}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

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
