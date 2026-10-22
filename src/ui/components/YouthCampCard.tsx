/** WIREFRAME: design.md §9.12 + PRD 03.6.1 / 03.6.2 — Satelliten-Camp-Karte */
import { HardHat, Lock, Mail, Star, UserCheck } from "lucide-react";
import type { Player } from "../../types/player.ts";
import { estimateCa } from "../../transfers/market-value.ts";
import { formatClubCash } from "../../economy/club-finances.ts";
import {
  campLeaderDisplayName,
  formatCampLeaderModLabel,
} from "../../youth/camp-leader-hire.ts";
import {
  campRoster,
  canBuyYouthCamp,
  weeklyCampUpkeepForCamp,
  type YouthCamp,
  type YouthCampNation,
} from "../../youth/satellite-camps.ts";
import { formatPlayerName, formatPlayerPositionLabel } from "../../types/player-display.ts";
import { useT } from "../../i18n/react.ts";
import { youthCampNationLabel } from "../../i18n/youth-camp-display.ts";
import {
  campConstructionWeeksRemaining,
  isCampOperational,
} from "../../youth/camp-construction.ts";
import { campPhotoGradient, campPhotoUrl } from "../assets/camp-photos.ts";
import { PlayerPortrait } from "./PlayerPortrait.tsx";

export function YouthCampCard({
  nation,
  owned,
  camps,
  cash,
  players,
  season,
  week,
  onBuy,
  onCommissionAgency,
  onRequestDismissLeader,
  onPull,
  rosterSlots,
}: {
  nation: YouthCampNation;
  owned: YouthCamp | undefined;
  camps: readonly YouthCamp[];
  cash: number;
  players: readonly Player[];
  season: number;
  week: number;
  rosterSlots: number;
  onBuy: (nationId: string) => void;
  onCommissionAgency: (nationId: string) => void;
  onRequestDismissLeader: (nationId: string) => void;
  onPull: (playerId: string) => void;
}) {
  const t = useT();
  const nationLabel = youthCampNationLabel(nation.id, nation.label);
  const buy = canBuyYouthCamp(camps, nation.id, cash);
  const roster = owned ? campRoster(players, nation.id) : [];
  const hireState = owned?.leader_hire ?? "none";
  const leaderName = owned ? campLeaderDisplayName(owned) : null;
  const leaderSeed = owned?.leader?.portrait_seed ?? 0;
  const underConstruction = owned != null && !isCampOperational(owned, season, week);
  const buildWeeksLeft = underConstruction
    ? campConstructionWeeksRemaining(owned!, season, week)
    : 0;
  const rosterOverflow = Math.max(0, roster.length - rosterSlots);
  const emptyOwned = owned && !underConstruction && roster.length === 0;
  const leaderTrainingMod = owned?.leader?.training_mod ?? 0;
  const leaderMentalMod = owned?.leader?.mental_mod ?? 0;
  const campPhotoSrc = campPhotoUrl(nation.id);

  return (
    <article
      className={`youth-camp-card${owned ? " is-owned" : buy.ok ? " is-available" : " is-locked"}${underConstruction ? " is-under-construction" : ""}${rosterSlots <= 3 ? " is-compact-roster" : ""}`}
      aria-label={`${nationLabel} ${nation.region}`}
      style={{ ["--youth-camp-roster-slots" as string]: rosterSlots }}
    >
      <header className="youth-camp-card-header">
        <div
          className="youth-camp-card-photo"
          style={{ backgroundImage: campPhotoGradient(nation.id) }}
        >
          {campPhotoSrc ? (
            <img
              className="youth-camp-card-photo-img"
              src={campPhotoSrc}
              alt=""
              loading="lazy"
              decoding="async"
            />
          ) : null}
          <div className="youth-camp-card-photo-scrim" aria-hidden="true" />
          {underConstruction ? (
            <span className="youth-camp-construction-badge" aria-hidden>
              <HardHat size={22} strokeWidth={2.25} />
            </span>
          ) : null}
        </div>
        <div className="youth-camp-card-head-row">
          <div className="youth-camp-card-head">
            <h3>
              {nationLabel}
              <span className="youth-camp-card-region">{nation.region}</span>
            </h3>
            {!owned ? (
              <p className="youth-camp-card-meta">
                {buy.ok ? formatClubCash(nation.cost) : <Lock size={14} aria-hidden />}
              </p>
            ) : (
              <p className="youth-camp-card-meta">
                {formatClubCash(weeklyCampUpkeepForCamp(owned))}/Wo
              </p>
            )}
          </div>

          {owned && !underConstruction ? (
            <div className="youth-camp-card-head-side">
              {hireState === "hired" && leaderName ? (
                <button
                  type="button"
                  className="youth-camp-leader-block"
                  onClick={() => onRequestDismissLeader(nation.id)}
                  aria-label={`${leaderName} — Leitung entlassen`}
                >
                  <span className="youth-camp-leader-copy">
                    <span className="youth-camp-leader-name">{leaderName}</span>
                    <span className="youth-camp-leader-mods">
                      <span className="camp-leader-mod-badge">
                        {formatCampLeaderModLabel("training", leaderTrainingMod)}
                      </span>
                      <span className="camp-leader-mod-badge">
                        {formatCampLeaderModLabel("mental", leaderMentalMod)}
                      </span>
                    </span>
                  </span>
                  <PlayerPortrait
                    seed={leaderSeed}
                    clubId={roster[0]?.club_id}
                    size="sm"
                    className="youth-camp-leader-portrait"
                  />
                </button>
              ) : hireState === "candidates_ready" ? (
                <p className="youth-camp-agency-hint">Kandidaten im Postfach</p>
              ) : (
                <button
                  type="button"
                  className="negotiation-btn youth-camp-staff-icon-btn"
                  onClick={() => onCommissionAgency(nation.id)}
                  aria-label={
                    hireState === "agency_pending"
                      ? "Agentur-Suche läuft — Status anzeigen"
                      : "Camp-Leiter suchen"
                  }
                >
                  {hireState === "agency_pending" ? (
                    <Mail size={18} strokeWidth={2.5} aria-hidden />
                  ) : (
                    <UserCheck size={18} strokeWidth={2.5} aria-hidden />
                  )}
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
              {t("youth.camp.buy")}
            </button>
          </div>
        ) : null}

        {owned && underConstruction ? (
          <p className="youth-camps-empty youth-camp-construction-copy">
            {buildWeeksLeft <= 1
              ? t("youth.camp.construction.nextWeek")
              : t("youth.camp.construction.weeks", { count: buildWeeksLeft })}
          </p>
        ) : null}

        {owned && !underConstruction ? (
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
                  <li
                    key={player.id}
                    className={`youth-camp-roster-row${player.state.camp_opening_headline ? " is-headline" : ""}`}
                  >
                    <PlayerPortrait seed={player.portrait_seed} nationality={player.nationality} clubId={player.club_id} size="sm" />
                    <span className="youth-camp-roster-name">
                      {player.state.camp_opening_headline ? (
                        <Star
                          size={12}
                          strokeWidth={2.5}
                          className="youth-camp-headline-badge"
                          aria-label="Camp-Debüt"
                        />
                      ) : null}
                      {formatPlayerName(player)}
                    </span>
                    <span className="youth-camp-roster-pos">{formatPlayerPositionLabel(player)}</span>
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
        ) : !owned && !buy.ok ? (
          <p className="youth-camps-empty youth-camp-card-locked-copy">{buy.reason ?? "Gesperrt"}</p>
        ) : null}
      </div>
    </article>
  );
}
