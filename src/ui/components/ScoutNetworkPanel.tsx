/** WIREFRAME: PRD 09 — F4.3 Scout-Netzwerk */
import { formatClubCash } from "../../economy/club-finances.ts";
import {
  formatTrust,
  SCOUT_TIERS,
  scoutCandidates,
  scoutNetworkAccuracyModifier,
  scoutNetworkCapacity,
  scoutNetworkWeeklyWage,
  type HiredScout,
  type ScoutNetworkState,
  type ScoutTierId,
} from "../../scouting/scout-network.ts";
import { Hint } from "./Hint.tsx";

const TIER_ORDER: ScoutTierId[] = ["local", "international", "elite"];

export function ScoutNetworkPanel({
  network,
  season,
  week,
  masterSeed,
  cash,
  onHire,
  onFire,
}: {
  network: ScoutNetworkState;
  season: number;
  week: number;
  masterSeed: number;
  cash: number;
  onHire: (scout: HiredScout) => void;
  onFire: (scoutId: string) => void;
}) {
  const capacity = scoutNetworkCapacity(network);
  const accuracy = scoutNetworkAccuracyModifier(network);
  const wage = scoutNetworkWeeklyWage(network);

  return (
    <section className="scout-network" aria-label="Scout-Netzwerk">
      <header className="scout-network-head">
        <Hint
          text="Mehr Scouts = mehr gleichzeitige Ziele und bessere Beobachtungsgenauigkeit (PRD 04.2)."
          block
        >
          <h2>🛰️ Scout-Netzwerk</h2>
        </Hint>
        <p className="scout-network-meta">
          Kapazität {capacity} · Genauigkeit ×{accuracy.toFixed(2)} · {formatClubCash(wage)}/Woche
        </p>
      </header>

      <ul className="scout-network-list">
        {network.scouts.map((scout) => {
          const tier = SCOUT_TIERS[scout.tier];
          return (
            <li key={scout.id} className="scout-network-row">
              <span className="scout-network-icon" aria-hidden="true">{tier.icon}</span>
              <div className="scout-network-copy">
                <strong>{scout.name}</strong>
                <small>
                  {tier.label} · Trust {scout.trust} ({formatTrust(scout.trust)}) · +{tier.capacity} Slots
                </small>
              </div>
              <button type="button" className="scout-network-fire" onClick={() => onFire(scout.id)}>
                Entlassen
              </button>
            </li>
          );
        })}
      </ul>

      <div className="scout-network-market">
        {TIER_ORDER.map((tierId) => {
          const tier = SCOUT_TIERS[tierId];
          const candidates = scoutCandidates(tierId, season, week, masterSeed);
          return (
            <article key={tierId} className="scout-network-tier">
              <h3>{tier.icon} {tier.label}</h3>
              <p className="scout-network-tier-meta">
                {tier.regions} · +{tier.capacity} · ×{tier.accuracy_modifier}
              </p>
              <ul>
                {candidates.map((candidate) => {
                  const affordable = cash >= candidate.wage_weekly * 4;
                  return (
                    <li key={candidate.id}>
                      <span>
                        <strong>{candidate.name}</strong>
                        <small>
                          Trust {candidate.trust} · {formatClubCash(candidate.wage_weekly)}/Wo
                        </small>
                      </span>
                      <button
                        type="button"
                        disabled={!affordable}
                        onClick={() => onHire(candidate)}
                      >
                        Einstellen
                      </button>
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
