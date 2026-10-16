/** WIREFRAME: design.md §9.6 — Transferliste */
import { useMemo, useState } from "react";
import { formatClubCash } from "../../economy/club-finances.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import type { Player } from "../../types/player.ts";
import type { TransferNegotiation, TransferState } from "../../transfers/negotiations.ts";
import { listedPlayerCa, searchListings } from "../../transfers/transfer-listings.ts";

export function TransferMarketPanel({
  players,
  rivalPlayers,
  clubId,
  transferState,
  onOpenNegotiation,
}: {
  players: readonly Player[];
  rivalPlayers: readonly Player[];
  clubId: string;
  transferState: TransferState;
  onOpenNegotiation: (playerId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const everyone = useMemo(() => [...players, ...rivalPlayers], [players, rivalPlayers]);
  const rows = searchListings(transferState.listings ?? [], everyone, {
    query,
    position: position || undefined,
    maxAge: maxAge.trim() === "" ? undefined : Number(maxAge),
  });
  const saleTalks = (transferState.negotiations ?? []).filter(
    (entry): entry is TransferNegotiation => entry.side === "sell" && entry.status === "active",
  );

  return (
    <section className="game-panel" aria-label="Transferliste">
      <h2>Transferliste</h2>
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
      <div className="training-individual-field">
        <input
          value={query}
          placeholder="Name oder Verein"
          aria-label="Transferliste durchsuchen"
          onChange={(event) => setQuery(event.target.value)}
        />
        <input
          value={position}
          placeholder="Position"
          aria-label="Position"
          onChange={(event) => setPosition(event.target.value.toUpperCase())}
        />
        <input
          value={maxAge}
          inputMode="numeric"
          placeholder="Alter bis"
          aria-label="Alter bis"
          onChange={(event) => setMaxAge(event.target.value)}
        />
      </div>
      <h3>Markt</h3>
      {rows.length === 0 ? <p>Keine passenden Angebote.</p> : null}
      <ul className="transfers-history">
        {rows.map(({ listing, player }) => (
          <li key={listing.player_id}>
            <button
              type="button"
              className="transfers-history-row"
              onClick={() => onOpenNegotiation(player.id)}
            >
              <span>
                {formatPlayerName(player)} · {player.position} · {player.age} · CA {listedPlayerCa(player)}
                {" · "}
                {formatClubCash(listing.asking_price)}
                {listing.club_id === clubId ? " · eigenes Angebot" : ` · ${listing.club_id}`}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
