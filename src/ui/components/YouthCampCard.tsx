/** WIREFRAME: design.md §9.12 + PRD 03.6.1 / 09.2 — Satelliten-Camp-Karte */
import { Lock, UserCheck } from "lucide-react";
import type { Player } from "../../types/player.ts";
import { estimateCa } from "../../transfers/market-value.ts";
import { formatClubCash } from "../../economy/club-finances.ts";
import {
  campLeaderName,
  campLeaderPortraitSeed,
  campRoster,
  canBuyYouthCamp,
  type YouthCamp,
  type YouthCampNation,
} from "../../youth/satellite-camps.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import { campPhotoGradient, campPhotoUrl } from "../assets/camp-photos.ts";
import { PlayerPortrait } from "./PlayerPortrait.tsx";

export function YouthCampCard({
  nation,
  owned,
  camps,
  cash,
  players,
  masterSeed,
  onBuy,
  onToggleStaff,
  onPull,
  rosterSlots,
}: {
  nation: YouthCampNation;
  owned: YouthCamp | undefined;
  camps: readonly YouthCamp[];
  cash: number;
  players: readonly Player[];
  masterSeed: number;
  rosterSlots: number;
  onBuy: (nationId: string) => void;
  onToggleStaff: (nationId: string, staffed: boolean) => void;
  onPull: (playerId: string) => void;
}) {
  const buy = canBuyYouthCamp(camps, nation.id, cash);
  const roster = owned ? campRoster(players, nation.id) : [];
  const photo = campPhotoUrl(nation.id);
  const leaderName = owned ? campLeaderName(nation.id, masterSeed) : null;
  const leaderSeed = owned ? campLeaderPortraitSeed(nation.id, masterSeed) : 0;
  const rosterOverflow = Math.max(0, roster.length - rosterSlots);
  const emptyOwned = owned && roster.length === 0;

  return (
    <article
      className={`youth-camp-card${owned ? " is-owned" : buy.ok ? " is-available" : " is-locked"}${rosterSlots <= 3 ? " is-compact-roster" : ""}`}
      aria-label={`${nation.label} ${nation.region}`}
      style={{ ["--youth-camp-roster-slots" as string]: rosterSlots }}
    >
      <header className="youth-camp-card-header">
        <div
          className="youth-camp-card-photo"
          style={{
            backgroundImage: photo ? `url(${photo})` : campPhotoGradient(nation.id),
          }}
        />
        <div className="youth-camp-card-head-row">
          <div className="youth-camp-card-head">
            <h3>
              {nation.label}
              <span className="youth-camp-card-region">{nation.region}</span>
            </h3>
            {!owned ? (
              <p className="youth-camp-card-meta">
                {buy.ok ? formatClubCash(nation.cost) : <Lock size={14} aria-hidden />}
              </p>
            ) : (
              <p className="youth-camp-card-meta">{formatClubCash(nation.upkeepWeekly)}/Wo</p>
            )}
          </div>

          {owned ? (
            <div className="youth-camp-card-head-side">
              {owned.staffed && leaderName ? (
                <button
                  type="button"
                  className="youth-camp-leader-block"
                  onClick={() => onToggleStaff(nation.id, false)}
                  aria-label={`Betreuer ${leaderName} abziehen`}
                >
                  <PlayerPortrait seed={leaderSeed} size="sm" className="youth-camp-leader-portrait" />
                  <span className="youth-camp-leader-name">{leaderName}</span>
                  <span className="youth-camp-leader-role">Camp-Leiter</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="negotiation-btn youth-camp-staff-icon-btn"
                  onClick={() => onToggleStaff(nation.id, true)}
                  aria-label="Betreuer vor Ort einstellen"
                >
                  <UserCheck size={18} strokeWidth={2.5} aria-hidden />
                </button>
              )}
            </div>
          ) : null}
        </div>
      </header>

      <div className={`youth-camp-card-body${emptyOwned ? " is-roster-empty" : ""}`}>
        {!owned && buy.ok ? (
          <div className="youth-camp-card-actions">
            <button type="button" className="negotiation-btn negotiation-btn-primary" onClick={() => onBuy(nation.id)}>
              Kaufen
            </button>
          </div>
        ) : null}

        {owned ? (
          <>
            {emptyOwned ? (
              <p className="youth-camps-empty youth-camp-roster-empty">Nächster Jahrgang: Saisonstart</p>
            ) : null}
            <div className="youth-camp-roster-stack">
            <ul className="youth-camp-roster" aria-label="Camp-Talente">
              {Array.from({ length: rosterSlots }, (_, index) => {
                const leadingPads = Math.max(0, rosterSlots - roster.length);
                if (index < leadingPads) {
                  return (
                    <li
                      key={`slot-${index}`}
                      className="youth-camp-roster-row is-slot-placeholder"
                      aria-hidden="true"
                    />
                  );
                }
                const player = roster[index - leadingPads];
                if (!player) {
                  return (
                    <li
                      key={`slot-${index}`}
                      className="youth-camp-roster-row is-slot-placeholder"
                      aria-hidden="true"
                    />
                  );
                }
                return (
                  <li key={player.id} className="youth-camp-roster-row">
                    <PlayerPortrait seed={player.portrait_seed} size="sm" />
                    <span className="youth-camp-roster-name">{formatPlayerName(player)}</span>
                    <span className="youth-camp-roster-pos">{player.position}</span>
                    <span className="youth-camp-roster-ca">
                      {Math.round(estimateCa(player.attributes, player.position))}
                    </span>
                    <button
                      type="button"
                      className="negotiation-btn negotiation-btn-primary youth-camp-pull"
                      onClick={() => onPull(player.id)}
                    >
                      HQ
                    </button>
                  </li>
                );
              })}
            </ul>
            {rosterOverflow > 0 ? (
              <p className="youth-camp-roster-more">+{rosterOverflow} im Camp</p>
            ) : null}
            </div>
          </>
        ) : !buy.ok ? (
          <p className="youth-camps-empty youth-camp-card-locked-copy">{buy.reason ?? "Gesperrt"}</p>
        ) : null}
      </div>
    </article>
  );
}
