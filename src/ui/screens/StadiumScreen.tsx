import {
  adjustBlockTicketPrice,
  stadiumAverageTicket,
  stadiumBlockIncome,
  stadiumMatchdayIncome,
  stadiumTotalCapacity,
  tierIcon,
  tierLabel,
  TICKET_PRICE_MAX,
  TICKET_PRICE_MIN,
  type ClubStadium,
  type StadiumBlock,
  type StadiumTier,
} from "../../stadium/club-stadium.ts";
import { formatClubCash } from "../../economy/club-finances.ts";
import { Hint } from "../components/Hint.tsx";

/**
 * WIREFRAME: PRD 10 F7.1 — Stadion 2D-Iso (Grundriss, Blöcke, Preiskategorien)
 */
export function StadiumScreen({
  stadium,
  onStadiumChange,
  onBack,
}: {
  stadium: ClubStadium;
  onStadiumChange: (stadium: ClubStadium) => void;
  onBack: () => void;
}) {
  const capacity = stadiumTotalCapacity(stadium);
  const matchdayIncome = stadiumMatchdayIncome(stadium);
  const avgTicket = stadiumAverageTicket(stadium);

  return (
    <main className="stadium">
      <header className="stadium-head">
        <button type="button" onClick={onBack} aria-label="Zurück">
          ←
        </button>
        <div>
          <p className="eyebrow">Verein</p>
          <h1>🏟️ {stadium.name}</h1>
          <p className="stadium-sub">
            {capacity.toLocaleString("de-DE")} Plätze · Ø Ticket € {avgTicket.toFixed(0)} · Heimspiel{" "}
            {formatClubCash(matchdayIncome)}
          </p>
        </div>
      </header>

      <Hint text="Preise pro Block anpassen — Einnahmen wirken ab dem nächsten Heimspiel." block>
        <section className="stadium-pitch" aria-label="Stadion-Grundriss">
          <div className="stadium-pitch-field" aria-hidden="true">
            <span className="stadium-pitch-line" />
          </div>
          <div className="stadium-blocks">
            {stadium.blocks.map((block) => (
              <StadiumBlockCard
                key={block.id}
                block={block}
                onPriceChange={(delta) =>
                  onStadiumChange(adjustBlockTicketPrice(stadium, block.id, delta))
                }
              />
            ))}
          </div>
        </section>
      </Hint>
    </main>
  );
}

function StadiumBlockCard({
  block,
  onPriceChange,
}: {
  block: StadiumBlock;
  onPriceChange: (delta: number) => void;
}) {
  const sold = Math.round(block.capacity * block.fill_rate);
  const income = Math.round(stadiumBlockIncome(block));

  return (
    <article className={`stadium-block is-${block.tier}`}>
      <IsoStand tier={block.tier} />
      <div className="stadium-block-body">
        <h2>
          <span aria-hidden="true">{tierIcon(block.tier)}</span> {block.name}
        </h2>
        <p className="stadium-block-meta">
          {tierLabel(block.tier)} · {block.capacity.toLocaleString("de-DE")} Plätze · ~{sold.toLocaleString("de-DE")}{" "}
          Zuschauer
        </p>
        <div className="stadium-price">
          <button
            type="button"
            aria-label={`${block.name} Ticketpreis senken`}
            disabled={block.ticket_price_eur <= TICKET_PRICE_MIN}
            onClick={() => onPriceChange(-2)}
          >
            −
          </button>
          <span>€ {block.ticket_price_eur}</span>
          <button
            type="button"
            aria-label={`${block.name} Ticketpreis erhöhen`}
            disabled={block.ticket_price_eur >= TICKET_PRICE_MAX}
            onClick={() => onPriceChange(2)}
          >
            +
          </button>
        </div>
        <p className="stadium-block-income">Heimspiel {formatClubCash(income)}</p>
      </div>
    </article>
  );
}

function IsoStand({ tier }: { tier: StadiumTier }) {
  const height = tier === "vip" ? 44 : tier === "seating" ? 34 : 24;
  const width = tier === "vip" ? 48 : 56;
  const roof = tier === "vip" ? "#f5c16c" : tier === "seating" ? "#94a3b8" : "#64748b";
  const wall = tier === "vip" ? "#78350f" : tier === "seating" ? "#334155" : "#1e293b";
  const cx = 60;
  const foot = 78;
  const top = foot - height;
  const halfW = width / 2;
  const halfD = 12;

  return (
    <svg className="stadium-iso" viewBox="0 0 120 96" aria-hidden="true">
      <polygon
        points={`${cx},${top} ${cx + halfW},${top + halfD} ${cx},${top + halfD * 2} ${cx - halfW},${top + halfD}`}
        fill={roof}
      />
      <polygon
        points={`${cx - halfW},${top + halfD} ${cx},${top + halfD * 2} ${cx},${foot + halfD} ${cx - halfW},${foot}`}
        fill={wall}
      />
      <polygon
        points={`${cx + halfW},${top + halfD} ${cx},${top + halfD * 2} ${cx},${foot + halfD} ${cx + halfW},${foot}`}
        fill={tier === "standing" ? "#0f172a" : "#475569"}
      />
    </svg>
  );
}
