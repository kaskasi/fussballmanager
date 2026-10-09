/** WIREFRAME: Finanzen · Tab Eintritt — read-only Tribünen-Auswertung */
import { useMemo, useState } from "react";
import {
  fillRateDeltaFromReference,
  fillRateHeatColor,
  stadiumBlockAttendees,
  stadiumBlockIncome,
  stadiumMatchdayIncome,
  tierIcon,
  tierLabel,
  type ClubStadium,
  type StadiumBlock,
} from "../../stadium/club-stadium.ts";
import {
  blockSeasonTicketTotal,
  blockTicketRowsForSeason,
  seasonHomeTicketMatches,
  seasonTicketTotal,
} from "../../stadium/ticket-analytics.ts";
import { formatClubCash, type ClubFinances } from "../../economy/club-finances.ts";
import { ModalShell } from "../components/primitives/ModalShell.tsx";
import { formatSeasonLabel } from "../../sim/season-label.ts";

const BLOCK_LAYOUT: Array<{ id: string; area: string }> = [
  { id: "north", area: "north" },
  { id: "west", area: "west" },
  { id: "east", area: "east" },
  { id: "south", area: "south" },
  { id: "vip", area: "vip" },
];

function BlockStatCard({
  block,
  stadium,
  finances,
  season,
  week,
  onOpen,
}: {
  block: StadiumBlock;
  stadium: ClubStadium;
  finances: ClubFinances;
  season: number;
  week: number;
  onOpen: () => void;
}) {
  const fillPct = Math.round(block.fill_rate * 100);
  const deltaPts = Math.round(fillRateDeltaFromReference(block) * 100);
  const perMatch = Math.round(stadiumBlockIncome(stadium, block, season, week));
  const seasonBlock = blockSeasonTicketTotal(stadium, block, finances, season);

  return (
    <button type="button" className="finances-ticket-zone" data-area={block.id} onClick={onOpen}>
      <span className="finances-ticket-zone-fill" style={{ background: fillRateHeatColor(block.fill_rate) }} />
      <span className="finances-ticket-zone-body">
        <strong>
          {tierIcon(block.tier)} {block.name}
        </strong>
        <p className="finances-ticket-zone-season">
          <strong>{formatClubCash(seasonBlock)}</strong>
          <span> Eintritt Saison bisher</span>
        </p>
        <span>
          {fillPct}% · € {block.ticket_price_eur} · ~{stadiumBlockAttendees(block).toLocaleString("de-DE")}
        </span>
        <span className="finances-ticket-zone-sub">
          Modell {formatClubCash(perMatch)}/Spiel
          {deltaPts !== 0 ? (
            <em className={deltaPts > 0 ? "is-up" : "is-down"}>
              {" "}
              ({deltaPts > 0 ? "+" : ""}
              {deltaPts} PP)
            </em>
          ) : null}
        </span>
      </span>
    </button>
  );
}

function BlockMatchesModal({
  block,
  stadium,
  finances,
  season,
  onClose,
}: {
  block: StadiumBlock;
  stadium: ClubStadium;
  finances: ClubFinances;
  season: number;
  onClose: () => void;
}) {
  const rows = useMemo(
    () => blockTicketRowsForSeason(stadium, block, finances, season),
    [block, stadium, finances, season],
  );
  const total = rows.reduce((sum, row) => sum + row.blockAmount, 0);

  return (
    <ModalShell ariaLabel={`${block.name} · Heimspiele`} title={block.name} onClose={onClose}>
      <p className="finances-ticket-modal-lead">
        {tierLabel(block.tier)} · Anteil aus gespeicherten Eintritts-Zeilen ({formatSeasonLabel(season)}).
        Block-Aufteilung modelliert aus aktueller Auslastung.
      </p>
      {rows.length === 0 ? (
        <p className="finances-ticket-modal-empty">Noch keine abgeschlossenen Heimspiel-Eintritte in dieser Saison.</p>
      ) : (
        <>
          <p className="finances-ticket-modal-sum">
            Summe ~{formatClubCash(total)} · {rows.length} Spiel{rows.length === 1 ? "" : "e"}
          </p>
          <ul className="finances-ticket-modal-list">
            {rows.map((row) => (
              <li key={row.week}>
                <span>Woche {row.week}</span>
                <span>Gesamt {formatClubCash(row.total)}</span>
                <strong>~{formatClubCash(row.blockAmount)}</strong>
              </li>
            ))}
          </ul>
        </>
      )}
    </ModalShell>
  );
}

export function StadiumTicketsPanel({
  stadium,
  finances,
  season,
  week,
}: {
  stadium: ClubStadium;
  finances: ClubFinances;
  season: number;
  week: number;
}) {
  const [modalBlockId, setModalBlockId] = useState<string | null>(null);
  const matches = seasonHomeTicketMatches(finances, season);
  const seasonTotal = seasonTicketTotal(finances, season);
  const modelPerMatch = stadiumMatchdayIncome(stadium, season, week);
  const modalBlock = stadium.blocks.find((entry) => entry.id === modalBlockId);

  return (
    <div className="finances-tickets" aria-label="Eintritt Auswertung">
      <p className="finances-tickets-lead">
        Nur Auswertung — Preise und Ausbau im Stadion. Klick auf eine Tribüne: Heimspiel-Liste dieser Saison.
      </p>
      <div className="finances-ticket-summary">
        <span>
          Saison {formatSeasonLabel(season)}: <strong>{formatClubCash(seasonTotal)}</strong> Eintritt (
          {matches.length} Heimspiel{matches.length === 1 ? "" : "e"})
        </span>
        <span>
          Modell nächstes Heimspiel: <strong>{formatClubCash(modelPerMatch)}</strong>
        </span>
      </div>
      <div className="finances-ticket-arena" aria-label="Tribünen-Karten">
        <div className="finances-ticket-pitch" aria-hidden="true" />
        {BLOCK_LAYOUT.map(({ id }) => {
          const block = stadium.blocks.find((entry) => entry.id === id);
          if (!block) return null;
          return (
            <BlockStatCard
              key={id}
              block={block}
              stadium={stadium}
              finances={finances}
              season={season}
              week={week}
              onOpen={() => setModalBlockId(id)}
            />
          );
        })}
      </div>
      {modalBlock ? (
        <BlockMatchesModal
          block={modalBlock}
          stadium={stadium}
          finances={finances}
          season={season}
          onClose={() => setModalBlockId(null)}
        />
      ) : null}
    </div>
  );
}
