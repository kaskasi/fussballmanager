/** WIREFRAME: design.md §9.6 — Transferliste */
import { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { formatClubCash } from "../../economy/club-finances.ts";
import { useT } from "../../i18n/react.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import type { Player, PositionPrimary } from "../../types/player.ts";
import type { ScoutBoard } from "../../scouting/scout-board.ts";
import { getBoardTarget } from "../../scouting/scout-board.ts";
import type { TransferNegotiation, TransferState } from "../../transfers/negotiations.ts";
import { loanClubName } from "../../transfers/loan-roster.ts";
import { listedPlayerCa, searchListings } from "../../transfers/transfer-listings.ts";
import type { WorldClub } from "../../world/world-generator.ts";
import { FilterChip, FilterToolbar } from "./primitives/index.ts";

const MARKET_POSITIONS: PositionPrimary[] = [
  "GK",
  "CB",
  "LB",
  "RB",
  "DM",
  "CM",
  "AM",
  "LM",
  "RM",
  "LW",
  "RW",
  "CF",
];

export function TransferMarketPanel({
  players,
  rivalPlayers,
  clubId,
  transferState,
  worldClubs,
  scoutBoard,
  onOpenNegotiation,
  onScoutPlayer,
}: {
  players: readonly Player[];
  rivalPlayers: readonly Player[];
  clubId: string;
  transferState: TransferState;
  worldClubs?: readonly WorldClub[];
  scoutBoard: ScoutBoard;
  onOpenNegotiation: (playerId: string) => void;
  onScoutPlayer: (playerId: string) => void;
}) {
  const t = useT();
  const [position, setPosition] = useState<PositionPrimary | "all">("all");
  const everyone = useMemo(() => [...players, ...rivalPlayers], [players, rivalPlayers]);
  const rows = searchListings(transferState.listings ?? [], everyone, {
    position: position === "all" ? undefined : position,
  });
  const saleTalks = (transferState.negotiations ?? []).filter(
    (entry): entry is TransferNegotiation => entry.side === "sell" && entry.status === "active",
  );

  return (
    <section className="game-panel" aria-label="Transfermarkt">
      <h2>Transfermarkt</h2>
      <p className="settings-section-lead">
        Nur gelistete Spieler. Eigene Kaderspieler listest du im Profil. Gebot öffnet die Verhandlung,
        danach den Vertrag.
      </p>
      {saleTalks.length > 0 ? (
        <ul className="transfers-history">
          {saleTalks.map((talk) => {
            const player = players.find((entry) => entry.id === talk.player_id);
            return (
              <li key={talk.id}>
                <button type="button" className="transfers-history-row" onClick={() => onOpenNegotiation(talk.player_id)}>
                  <span>
                    Angebot für {player ? formatPlayerName(player) : talk.player_id}
                    {" · "}
                    {formatClubCash(talk.counter_offer ?? talk.current_offer)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      <FilterToolbar ariaLabel="Transfermarkt nach Position filtern" className="transfers-position-toolbar">
        <FilterChip active={position === "all"} onClick={() => setPosition("all")}>
          {t("scouting.filter.all")}
        </FilterChip>
        {MARKET_POSITIONS.map((slot) => (
          <FilterChip
            key={slot}
            active={position === slot}
            onClick={() => setPosition(position === slot ? "all" : slot)}
          >
            {slot}
          </FilterChip>
        ))}
      </FilterToolbar>
      {rows.length === 0 ? <p>Keine passenden Angebote.</p> : null}
      <ul className="transfers-history">
        {rows.map(({ listing, player }) => {
          const isOwnListing = listing.club_id === clubId;
          const scoutTarget = isOwnListing
            ? null
            : getBoardTarget(scoutBoard, player.id, rivalPlayers);
          const scoutAssigned = Boolean(scoutTarget?.assigned);
          return (
            <li key={listing.player_id}>
              <div className="transfers-history-row transfers-market-row">
                <button
                  type="button"
                  className="transfers-market-row-main"
                  onClick={() => onOpenNegotiation(player.id)}
                >
                  {formatPlayerName(player)} · {player.position} · {player.age} · CA{" "}
                  {listedPlayerCa(player)}
                  {" · "}
                  {formatClubCash(listing.asking_price)}
                  {isOwnListing
                    ? " · eigenes Angebot"
                    : ` · ${loanClubName(listing.club_id, worldClubs)}`}
                </button>
                {!isOwnListing ? (
                  <button
                    type="button"
                    className={
                      scoutAssigned
                        ? "transfers-market-scout-icon is-on"
                        : "transfers-market-scout-icon"
                    }
                    disabled={scoutAssigned}
                    aria-label={
                      scoutAssigned ? t("scouting.hits.scoutActive") : t("scouting.hits.scoutCta")
                    }
                    title={
                      scoutAssigned ? t("scouting.hits.scoutActive") : t("scouting.hits.scoutCta")
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      onScoutPlayer(player.id);
                    }}
                  >
                    <Eye size={18} strokeWidth={2.25} aria-hidden />
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
