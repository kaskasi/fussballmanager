import { useMemo, useState } from "react";
import { Briefcase, Hourglass, UserRound } from "lucide-react";
import { formatClubCash, formatClubCashWeekly } from "../../economy/club-finances.ts";
import {
  MERCH_SKU_IDS,
  MERCH_SKU_LABEL,
  merchInboundQtyBySku,
  merchStockFillRatio,
  type ClubMerchandising,
} from "../../economy/merchandising.ts";
import {
  MERCH_EXPERT_AGENCY_NOTICE,
  MERCH_EXPERT_CASH_RESERVE,
  MERCH_EXPERT_TARGET_FILL,
  generateMerchExpertCandidates,
  merchExpertCandidateSetId,
  merchExpertDisplayName,
  merchExpertExpressRebate,
  merchExpertHirePhase,
  merchExpertReorderTrigger,
  merchExpertSkillLabel,
  merchExpertWorkdaysLeft,
  normalizeMerchExpert,
  type MerchExpertCandidate,
} from "../../economy/merchandising-expert.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import type { CampDayStamp } from "../../youth/satellite-camps.ts";
import { PlayerPortrait } from "./PlayerPortrait.tsx";

function SkillMeter({ skill }: { skill: number }) {
  return (
    <span className="merch-expert-skill">
      <span
        className="merch-expert-skill__bar"
        role="meter"
        aria-label="Einkaufs-Skill"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={skill}
      >
        <span className="merch-expert-skill__fill" style={{ width: `${skill}%` }} />
      </span>
      <span className="merch-expert-skill__label">
        {merchExpertSkillLabel(skill)} · {skill}
      </span>
    </span>
  );
}

function CandidateCard({
  candidate,
  onHire,
}: {
  candidate: MerchExpertCandidate;
  onHire: () => void;
}) {
  const name = formatPlayerName({ name: candidate.name, portrait_seed: candidate.portrait_seed });
  return (
    <li>
      <article
        className={`camp-leader-candidate merch-expert-candidate${candidate.disqualified ? " is-disqualified" : ""}`}
      >
        <PlayerPortrait seed={candidate.portrait_seed} pool="mixed" size="md" />
        <div className="camp-leader-candidate-body">
          <h3>{name}</h3>
          {candidate.disqualified ? null : (
            <>
              <SkillMeter skill={candidate.skill} />
              <p className="merch-expert-wage">
                Gehalt <strong>{formatClubCashWeekly(candidate.wage_weekly)}</strong>
              </p>
            </>
          )}
          <div className="camp-leader-candidate-intro">
            {candidate.intro.map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
          {candidate.disqualified ? (
            <p className="camp-leader-candidate-blocked">{candidate.disqualifyReason}</p>
          ) : (
            <button type="button" className="merch-on-demand-action" onClick={onHire}>
              Einstellen
            </button>
          )}
        </div>
      </article>
    </li>
  );
}

/** WIREFRAME: design.md §9 — Merchandising-Experte (Agentur wie Camp-Leiter, Gehalt, Auto-Nachkauf). */
export function MerchExpertPanel({
  merch,
  now,
  masterSeed,
  fanshopLevel,
  onCommission,
  onHire,
  onDismiss,
}: {
  merch: ClubMerchandising;
  now: CampDayStamp;
  masterSeed: number;
  fanshopLevel: number;
  onCommission: () => void;
  onHire: (candidate: MerchExpertCandidate) => void;
  onDismiss: () => void;
}) {
  const state = normalizeMerchExpert(merch.expert);
  const phase = merchExpertHirePhase(state, now);
  const [confirmDismiss, setConfirmDismiss] = useState(false);

  const candidates = useMemo(
    () =>
      phase === "candidates_ready" && state.agency_commissioned_at
        ? generateMerchExpertCandidates({
            masterSeed,
            candidateSetId: merchExpertCandidateSetId(state.agency_commissioned_at),
          })
        : [],
    [masterSeed, phase, state.agency_commissioned_at],
  );
  const inbound = merchInboundQtyBySku(merch);

  return (
    <section className="merch-expert" aria-label="Merchandising-Experte">
      <header className="merch-expert-head">
        <Briefcase size={20} strokeWidth={2.2} aria-hidden />
        <div>
          <h2>Merchandising-Experte</h2>
          <p className="merch-muted">
            Kauft per Express nach, sobald das Lager unter die Basis von{" "}
            {Math.round(MERCH_EXPERT_TARGET_FILL * 100)} % fällt.
          </p>
        </div>
      </header>

      {phase === "none" ? (
        <div className="merch-expert-empty">
          <p>
            Ohne Experten bestellst du selbst nach. Mit Experten hält das Lager automatisch die
            Basis — gegen ein festes Wochengehalt.
          </p>
          <button type="button" className="merch-on-demand-action" onClick={onCommission}>
            Agentur beauftragen
          </button>
        </div>
      ) : null}

      {phase === "agency_pending" && state.agency_commissioned_at ? (
        <div className="merch-expert-empty">
          <p className="merch-expert-pending">
            <Hourglass size={16} strokeWidth={2.2} aria-hidden />
            <span>
              {MERCH_EXPERT_AGENCY_NOTICE} Noch{" "}
              {merchExpertWorkdaysLeft(state.agency_commissioned_at, now)} Werktage.
            </span>
          </p>
        </div>
      ) : null}

      {phase === "candidates_ready" ? (
        <div>
          <p className="camp-leader-hire-lead">
            Die Agentur hat drei Kandidaten vorgestellt. Skill und Gehalt gehen Hand in Hand.
          </p>
          <ul className="camp-leader-candidate-list">
            {candidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                onHire={() => onHire(candidate)}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {phase === "hired" && state.expert ? (
        <div className="merch-expert-hired">
          <article className="merch-expert-card">
            <PlayerPortrait seed={state.expert.portrait_seed} pool="mixed" size="lg" />
            <div className="merch-expert-card__body">
              <h3>
                <UserRound size={16} strokeWidth={2.2} aria-hidden />{" "}
                {merchExpertDisplayName(state.expert)}
              </h3>
              <SkillMeter skill={state.expert.skill} />
              <p className="merch-expert-wage">
                Gehalt <strong>{formatClubCashWeekly(state.expert.wage_weekly)}</strong>
              </p>
              <ul className="merch-expert-rules">
                <li>
                  Bestellt, sobald ein Artikel unter{" "}
                  {(merchExpertReorderTrigger(state.expert.skill) * 100).toFixed(1)} % Lager fällt
                </li>
                <li>Füllt auf {Math.round(MERCH_EXPERT_TARGET_FILL * 100)} % auf</li>
                <li>
                  Express-Rabatt {(merchExpertExpressRebate(state.expert.skill) * 100).toFixed(1)} %
                </li>
              </ul>
            </div>
          </article>

          <ul className="merch-expert-stock" aria-label="Lager gegen Basis">
            {MERCH_SKU_IDS.map((sku) => {
              const row = merch.skus[sku];
              const fill = merchStockFillRatio(row?.stock ?? 0, fanshopLevel, sku);
              const inboundFill = merchStockFillRatio(inbound[sku] ?? 0, fanshopLevel, sku);
              return (
                <li key={sku} className="merch-expert-stock__row">
                  <span className="merch-expert-stock__name">{MERCH_SKU_LABEL[sku]}</span>
                  <span className="merch-expert-stock__track" aria-hidden>
                    <span
                      className="merch-expert-stock__fill"
                      style={{ width: `${Math.min(100, fill * 100)}%` }}
                    />
                    <span
                      className="merch-expert-stock__inbound"
                      style={{
                        left: `${Math.min(100, fill * 100)}%`,
                        width: `${Math.max(0, Math.min(100 - fill * 100, inboundFill * 100))}%`,
                      }}
                    />
                    <span
                      className="merch-expert-stock__base"
                      style={{ left: `${MERCH_EXPERT_TARGET_FILL * 100}%` }}
                    />
                  </span>
                  <span className="merch-expert-stock__pct">{Math.round(fill * 100)} %</span>
                </li>
              );
            })}
          </ul>
          <p className="merch-muted merch-expert-foot">
            Nachkäufe laufen wöchentlich nach dem Verkauf und erscheinen als Ausgabe unter
            Merchandising im Finanzbericht. Bei knapper Kasse (unter {formatClubCash(MERCH_EXPERT_CASH_RESERVE)})
            bestellt der Experte nicht.
          </p>

          {confirmDismiss ? (
            <div className="merch-expert-confirm" role="group" aria-label="Entlassung bestätigen">
              <span>Experten wirklich entlassen?</span>
              <button
                type="button"
                className="merch-on-demand-action"
                onClick={() => {
                  setConfirmDismiss(false);
                  onDismiss();
                }}
              >
                Ja, entlassen
              </button>
              <button
                type="button"
                className="merch-on-demand-action merch-on-demand-action--ghost"
                onClick={() => setConfirmDismiss(false)}
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="merch-on-demand-action merch-on-demand-action--ghost"
              onClick={() => setConfirmDismiss(true)}
            >
              Entlassen
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}
