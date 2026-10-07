/** WIREFRAME: design.md §9 — Scout-Netzwerk Personal (Karten-Grid) */
import type { ReactNode } from "react";
import { Crosshair, Globe, MapPin, Radar } from "lucide-react";
import { formatClubCash } from "../../economy/club-finances.ts";
import { useT } from "../../i18n/react.ts";
import {
  formatTrust,
  MAX_HIRED_SCOUTS,
  SCOUT_TIERS,
  availableScoutCandidates,
  canHireScout,
  scoutNetworkAccuracyModifier,
  scoutNetworkCapacity,
  scoutNetworkWeeklyWage,
  type HiredScout,
  type ScoutNetworkState,
  type ScoutTierId,
} from "../../scouting/scout-network.ts";
import { Hint } from "./Hint.tsx";

const TIER_ORDER: ScoutTierId[] = ["local", "international", "elite"];

function ScoutTierGlyph({ tierId, size = 17 }: { tierId: ScoutTierId; size?: number }) {
  const props = { size, strokeWidth: 2.25, "aria-hidden": true as const };
  switch (tierId) {
    case "local":
      return <MapPin {...props} />;
    case "international":
      return <Globe {...props} />;
    case "elite":
      return <Crosshair {...props} />;
  }
}

function ScoutNetworkCardShell({
  tierId,
  name,
  meta,
  action,
}: {
  tierId: ScoutTierId | null;
  name: string;
  meta: string;
  action?: ReactNode;
}) {
  const empty = tierId == null;
  return (
    <article
      className={empty ? "scout-network-card is-empty" : "scout-network-card"}
      aria-label={name}
    >
      <div className="scout-network-card-body">
        <div className={`scout-network-card-icon${empty ? " is-empty" : ""}`}>
          {tierId ? <ScoutTierGlyph tierId={tierId} /> : null}
        </div>
        <div className="scout-network-card-copy">
          <span className="scout-network-card-name">{name}</span>
          {meta ? <span className="scout-network-card-meta">{meta}</span> : null}
        </div>
      </div>
      {action ? <div className="scout-network-card-foot">{action}</div> : null}
    </article>
  );
}

export function ScoutNetworkPanel({
  network,
  season,
  week,
  masterSeed,
  cash,
  onHire,
  onFire,
  showHead = true,
}: {
  network: ScoutNetworkState;
  season: number;
  week: number;
  masterSeed: number;
  cash: number;
  onHire: (scout: HiredScout) => void;
  onFire: (scoutId: string) => void;
  showHead?: boolean;
}) {
  const t = useT();
  const capacity = scoutNetworkCapacity(network);
  const accuracy = scoutNetworkAccuracyModifier(network);
  const wage = scoutNetworkWeeklyWage(network);
  const rosterFull = !canHireScout(network);
  const emptySlots = Math.max(0, MAX_HIRED_SCOUTS - network.scouts.length);

  return (
    <section className="scout-network" aria-label={t("scouting.network.aria")}>
      {showHead ? (
        <header className="scout-network-head">
          <Hint text={t("scouting.network.hint")} block>
            <h2 className="scout-network-title">
              <Radar size={18} strokeWidth={2.25} aria-hidden />
              {t("scouting.network.title")}
            </h2>
          </Hint>
          <p className="scout-network-meta">
            {t("scouting.network.meta", {
              scouts: network.scouts.length,
              max: MAX_HIRED_SCOUTS,
              capacity,
              accuracy: accuracy.toFixed(2),
            })}
            {" · "}
            {formatClubCash(wage)}
            {t("scouting.network.perWeek")}
          </p>
        </header>
      ) : null}

      <div className="scout-network-roster" role="list" aria-label={t("scouting.network.rosterAria")}>
        {network.scouts.map((scout) => {
          const tier = SCOUT_TIERS[scout.tier];
          return (
            <div key={scout.id} className="scout-network-roster-cell" role="listitem">
              <ScoutNetworkCardShell
                tierId={scout.tier}
                name={scout.name}
                meta={t("scouting.network.scoutLine", {
                  tier: tier.label,
                  trust: scout.trust,
                  trustLabel: formatTrust(scout.trust),
                  slots: tier.capacity,
                })}
                action={
                  <button
                    type="button"
                    className="scout-network-btn scout-network-btn--fire"
                    onClick={() => onFire(scout.id)}
                  >
                    {t("scouting.network.fire")}
                  </button>
                }
              />
            </div>
          );
        })}
        {Array.from({ length: emptySlots }, (_, index) => (
          <div key={`empty-${index}`} className="scout-network-roster-cell" role="listitem">
            <ScoutNetworkCardShell
              tierId={null}
              name={t("scouting.network.slotEmpty")}
              meta=""
            />
          </div>
        ))}
      </div>

      <div className="scout-network-market" aria-label={t("scouting.network.marketAria")}>
        {TIER_ORDER.map((tierId) => {
          const tier = SCOUT_TIERS[tierId];
          const candidates = availableScoutCandidates(tierId, season, week, masterSeed, network);
          if (candidates.length === 0) return null;
          return (
            <section key={tierId} className="scout-network-tier">
              <header className="scout-network-tier-head">
                <h3>
                  <ScoutTierGlyph tierId={tierId} size={16} />
                  {tier.label}
                </h3>
                <p className="scout-network-tier-meta">
                  {t("scouting.network.tierFoot", {
                    regions: tier.regions,
                    capacity: tier.capacity,
                    accuracy: tier.accuracy_modifier,
                  })}
                </p>
              </header>
              <ul className="scout-network-market-grid">
                {candidates.map((candidate) => {
                  const affordable = cash >= candidate.wage_weekly * 4;
                  const disabled = !affordable || rosterFull;
                  return (
                    <li key={candidate.id}>
                      <ScoutNetworkCardShell
                        tierId={tierId}
                        name={candidate.name}
                        meta={t("scouting.network.candidateLine", {
                          trust: candidate.trust,
                          wage: formatClubCash(candidate.wage_weekly),
                        })}
                        action={
                          <button
                            type="button"
                            className="scout-network-btn scout-network-btn--hire"
                            disabled={disabled}
                            title={
                              rosterFull
                                ? t("scouting.network.rosterFull")
                                : !affordable
                                  ? t("scouting.network.cannotAfford")
                                  : undefined
                            }
                            onClick={() => onHire(candidate)}
                          >
                            {t("scouting.network.hire")}
                          </button>
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </section>
  );
}
