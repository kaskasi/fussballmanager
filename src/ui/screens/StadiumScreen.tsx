import { useState } from "react";
import { Construction, Dumbbell, Home, Star } from "lucide-react";
import type { AcademyFacility } from "../../youth/intake-generator.ts";
import {
  ACADEMY_FACILITIES,
  academyStage,
  canBuyAcademyUpgrade,
  facilityById,
  facilityGate,
} from "../../youth/academy.ts";
import { hqIntakeCount } from "../../youth/intake-generator.ts";
import {
  adjustBlockTicketPrice,
  fillRateDeltaFromReference,
  fillRateHeatColor,
  referenceFillRate,
  stadiumAverageTicket,
  stadiumBlockAttendees,
  stadiumBlockIncome,
  stadiumMatchdayIncome,
  stadiumTotalCapacity,
  tierIcon,
  tierLabel,
  FILL_RATE_MIN,
  TICKET_PRICE_MAX,
  TICKET_PRICE_MIN,
  type ClubStadium,
  type StadiumBlock,
  type StadiumTier,
} from "../../stadium/club-stadium.ts";
import { formatClubCash, type ClubFinances } from "../../economy/club-finances.ts";
import { CashChip } from "../components/CashChip.tsx";
import {
  canPurchaseStadiumUpgrade,
  stadiumUpgradeCatalog,
  stadiumUpgradeCost,
  stadiumUpgradeLevel,
} from "../../stadium/stadium-upgrades.ts";
import {
  fanbaseMood,
  fanbaseMoodIcon,
  fanbaseMoodLabel,
  formatFanbase,
} from "../../stadium/fanbase.ts";
import { DEFAULT_FANBASE } from "../../stadium/club-stadium.ts";
import { Hint } from "../components/Hint.tsx";
import { PrecinctGrid } from "../components/PrecinctGrid.tsx";
import { SponsorDealModal } from "../components/SponsorDealModal.tsx";
import {
  PRECINCT_HEADER_PHOTO,
  STADIUM_MOOD_PHOTOS,
  stadiumPhotoTierFromCapacity,
} from "../assets/mood-photos.ts";
import { MoodPhotoBand } from "../components/MoodPhotoBand.tsx";
import { emptyPrecinct, type PrecinctBuilding, type PrecinctEdge } from "../../stadium/precinct.ts";
import {
  dealForSlot,
  signSponsorDeal,
  sponsorSlotsForStand,
  takenSponsorBrandKeys,
  SPONSOR_SLOTS,
  type SponsorDeal,
  type SponsorOffer,
  type SponsorStand,
} from "../../stadium/sponsor-deals.ts";

type StadiumTab = "plan" | "precinct" | "upgrades";

/**
 * WIREFRAME: docs/prd/design.md §9.3 — Stadion
 * [Grundriss] [Gelände] [Ausbau]
 * Banden sitzen auf den Tribünen-Karten um den Grundriss.
 * Klick = F6.5-Modal. Gelände: 🏟️ Mitte, 2×5-Plättchen, Startstraße Stadt→Arena.
 */
export function StadiumScreen({
  stadium,
  finances,
  season,
  onStadiumChange,
  onPurchaseUpgrade,
  onPlacePrecinct,
  onUpgradePrecinct,
  onBuyParcel,
  onPlaceStreet,
  onExpandPrecinct,
  onShrinkPrecinctToMin,
  academyFacility,
  onUpgradeAcademy,
}: {
  stadium: ClubStadium;
  finances: ClubFinances;
  season: number;
  academyFacility?: AcademyFacility;
  onUpgradeAcademy?: () => void;
  onStadiumChange: (stadium: ClubStadium) => void;
  onPurchaseUpgrade: (upgradeId: string) => void;
  onPlacePrecinct: (
    building: PrecinctBuilding,
    x: number,
    y: number,
    from?: { x: number; y: number },
  ) => void;
  onUpgradePrecinct: (building: PrecinctBuilding) => void;
  onBuyParcel: () => void;
  onPlaceStreet: (cells: Array<{ x: number; y: number }>) => void;
  onExpandPrecinct: (patchId: string, edge: PrecinctEdge, delta?: 1 | -1) => void;
  onShrinkPrecinctToMin: (patchId: string) => void;
}) {
  const [tab, setTab] = useState<StadiumTab>("plan");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openSlotId, setOpenSlotId] = useState<string | null>(null);
  const capacity = stadiumTotalCapacity(stadium);
  const moodPhoto = STADIUM_MOOD_PHOTOS[stadiumPhotoTierFromCapacity(capacity)];
  const matchdayIncome = stadiumMatchdayIncome(stadium);
  const avgTicket = stadiumAverageTicket(stadium);
  const fanbase = stadium.fanbase ?? DEFAULT_FANBASE;
  const mood = fanbaseMood(fanbase);
  const delta = stadium.fanbase_last_delta;
  const precinct = stadium.precinct ?? emptyPrecinct();
  const openSlot = SPONSOR_SLOTS.find((slot) => slot.id === openSlotId);
  const openDeal = openSlot ? dealForSlot(stadium.sponsor_deals, openSlot.id, season) : undefined;

  const blockOrder = ["north", "west", "east", "south", "vip"] as const;

  function signDeal(slotId: string, offer: SponsorOffer) {
    onStadiumChange({
      ...stadium,
      sponsor_deals: signSponsorDeal(stadium.sponsor_deals, slotId, season, offer),
    });
    setOpenSlotId(null);
  }

  const stadiumTabs: { id: StadiumTab; label: string }[] = [
    { id: "plan", label: "Grundriss" },
    { id: "precinct", label: "Gelände" },
    { id: "upgrades", label: "Ausbau" },
  ];

  const stadiumContext = (
    <>
      <header className="stadium-scoreboard">
        <h2 className="stadium-scoreboard-name">{stadium.name}</h2>
        <p className="stadium-sub">
          {capacity.toLocaleString("de-DE")} Plätze · Ø Ticket € {avgTicket.toFixed(0)} · Heimspiel{" "}
          {formatClubCash(matchdayIncome)}
        </p>
      </header>
      <MoodPhotoBand src={moodPhoto} className="stadium-hero" />
      <section className="stadium-fanbase" aria-label="Fanbase">
        <div className={`stadium-fanbase-card is-${mood}`}>
          <span className="stadium-fanbase-icon" aria-hidden="true">
            {fanbaseMoodIcon(mood)}
          </span>
          <div>
            <strong>Fanbase {formatFanbase(fanbase)}</strong>
            <p>Erfolg &amp; Tabellenplatz steuern die Zuschauerzahl</p>
          </div>
          {delta != null && delta !== 0 ? (
            <span className={delta > 0 ? "stadium-fanbase-delta is-up" : "stadium-fanbase-delta is-down"}>
              {delta > 0 ? "+" : ""}
              {delta.toFixed(1)} diese Woche
            </span>
          ) : null}
        </div>
      </section>
    </>
  );

  return (
    <main className="stadium club-shell-card-body">
      <div className="fm-tab-bar" role="tablist" aria-label="Stadionbereiche">
        {stadiumTabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "fm-tab is-active" : "fm-tab"}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "plan" ? (
        <div className="fm-tab-panel">
          {stadiumContext}
          <Hint text="Leere Banden auf den Tribünen-Karten klicken — Laufzeit und Geld im Modal." block>
            <section className="stadium-layout" aria-label="Stadion-Grundriss">
            <StadiumPitchPlan
              blocks={stadium.blocks}
              deals={stadium.sponsor_deals}
              season={season}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onOpenSlot={setOpenSlotId}
            />
            {blockOrder.map((blockId) => {
              const block = stadium.blocks.find((entry) => entry.id === blockId);
              if (!block) return null;
              return (
                <StadiumBlockCard
                  key={block.id}
                  block={block}
                  area={block.id}
                  selected={selectedId === block.id}
                  deals={stadium.sponsor_deals}
                  season={season}
                  upgradeLevels={stadium.upgrade_levels}
                  onSelect={() => setSelectedId(block.id)}
                  onOpenSlot={setOpenSlotId}
                  onPriceChange={(priceDelta) =>
                    onStadiumChange(adjustBlockTicketPrice(stadium, block.id, priceDelta))
                  }
                />
              );
            })}
            </section>
          </Hint>
        </div>
      ) : null}

      {tab === "precinct" ? (
        <div className="fm-tab-panel">
          {stadiumContext}
          <MoodPhotoBand src={PRECINCT_HEADER_PHOTO} className="stadium-precinct-header" />
          <PrecinctGrid
            precinct={precinct}
            cash={finances.cash}
            stadiumName={stadium.name}
            onPlace={onPlacePrecinct}
            onUpgrade={onUpgradePrecinct}
            onBuyParcel={onBuyParcel}
            onPlaceStreet={onPlaceStreet}
            onExpand={onExpandPrecinct}
            onShrinkToMin={onShrinkPrecinctToMin}
          />
        </div>
      ) : null}

      {tab === "upgrades" ? (
        <div className="fm-tab-panel">
          {stadiumContext}
          <section className="stadium-upgrades" aria-label="Stadionausbau">
            <CashChip cash={finances.cash} />
          {academyFacility && onUpgradeAcademy ? (
            <AcademyUpgradeSection
              ownedId={academyFacility}
              stadiumCapacity={capacity}
              cash={finances.cash}
              onUpgrade={onUpgradeAcademy}
            />
          ) : null}
          <h3 className="stadium-upgrade-category">Stadion</h3>
          <ul className="stadium-upgrade-list">
            {stadiumUpgradeCatalog().map((upgrade) => {
              const level = stadiumUpgradeLevel(stadium, upgrade.id);
              const maxed = level >= upgrade.max_level;
              const nextCost = maxed ? null : stadiumUpgradeCost(upgrade, level + 1);
              const check = canPurchaseStadiumUpgrade(stadium, finances, upgrade.id);
              return (
                <li key={upgrade.id} className="stadium-upgrade-card">
                  <span className="stadium-upgrade-icon" aria-hidden="true">
                    <Construction size={20} strokeWidth={2.5} />
                  </span>
                  <div className="stadium-upgrade-body">
                    <strong>{upgrade.name}</strong>
                    <p>{upgrade.description}</p>
                    <p className="stadium-upgrade-meta">
                      Stufe {level}/{upgrade.max_level}
                      {nextCost != null ? ` · ${formatClubCash(nextCost)}` : " · Max"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="stadium-upgrade-buy"
                    disabled={!check.allowed}
                    title={check.reason}
                    onClick={() => onPurchaseUpgrade(upgrade.id)}
                  >
                    {maxed ? "✓" : "Kaufen"}
                  </button>
                </li>
              );
            })}
          </ul>
          </section>
        </div>
      ) : null}

      {openSlot ? (
        <SponsorDealModal
          slot={openSlot}
          deal={openDeal}
          season={season}
          takenBrandKeys={takenSponsorBrandKeys(stadium.sponsor_deals, season, openSlot.id)}
          onSign={(offer) => signDeal(openSlot.id, offer)}
          onClose={() => setOpenSlotId(null)}
        />
      ) : null}
    </main>
  );
}

function StadiumPitchPlan({
  blocks,
  deals,
  season,
  selectedId,
  onSelect,
  onOpenSlot,
}: {
  blocks: readonly StadiumBlock[];
  deals: ClubStadium["sponsor_deals"];
  season: number;
  selectedId: string | null;
  onSelect: (blockId: string) => void;
  onOpenSlot: (slotId: string) => void;
}) {
  const byId = Object.fromEntries(blocks.map((block) => [block.id, block]));
  const shirt = SPONSOR_SLOTS.find((slot) => slot.kind === "shirt");
  const shirtDeal = shirt ? dealForSlot(deals, shirt.id, season) : undefined;

  const zones: Array<{ id: string; x: number; y: number; w: number; h: number; label: string }> = [
    { id: "north", x: 24, y: 8, w: 272, h: 44, label: "N" },
    { id: "south", x: 24, y: 228, w: 200, h: 44, label: "S" },
    { id: "west", x: 8, y: 58, w: 44, h: 164, label: "W" },
    { id: "east", x: 268, y: 58, w: 44, h: 164, label: "O" },
    { id: "vip", x: 232, y: 228, w: 64, h: 44, label: "VIP" },
  ];

  return (
    <div className="stadium-pitch-map">
      <svg className="stadium-plan" viewBox="0 0 320 280" role="img" aria-label="Stadion-Grundriss">
        <rect x="58" y="58" width="204" height="164" rx="8" fill="#15803d" stroke="#ecfdf5" strokeWidth="2" />
        <circle cx="160" cy="140" r="28" fill="none" stroke="rgb(255 255 255 / 35%)" strokeWidth="2" />
        <line x1="160" y1="58" x2="160" y2="222" stroke="rgb(255 255 255 / 25%)" strokeWidth="2" />
        {zones.map((zone) => {
          const block = byId[zone.id];
          const fillPct = block ? Math.round(block.fill_rate * 100) : 0;
          const selected = selectedId === zone.id;
          const zoneFill = block?.fill_rate ?? FILL_RATE_MIN;
          return (
            <g key={zone.id}>
              <rect
                x={zone.x}
                y={zone.y}
                width={zone.w}
                height={zone.h}
                rx={6}
                fill={fillRateHeatColor(zoneFill)}
                className={selected ? "stadium-plan-zone is-selected" : "stadium-plan-zone"}
                onClick={() => onSelect(zone.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(zone.id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={block ? `${block.name}, ${fillPct}% Auslastung` : zone.label}
              >
                <title>{block ? `${block.name} · ${fillPct}%` : zone.label}</title>
              </rect>
              <text
                x={zone.x + zone.w / 2}
                y={zone.y + zone.h / 2 + 4}
                textAnchor="middle"
                className="stadium-plan-label"
                pointerEvents="none"
              >
                {zone.label}
              </text>
            </g>
          );
        })}
      </svg>
      {shirt ? (
        <aside className="stadium-commerce" aria-label="Trikotfläche">
          <button
            type="button"
            className={shirtDeal ? "stadium-commerce-slot" : "stadium-commerce-slot is-empty"}
            title={shirtDeal ? `${shirtDeal.brand} auf der Brust` : "Trikot ohne Brustlogo"}
            onClick={() => onOpenSlot(shirt.id)}
          >
            <span aria-hidden="true">👕</span>
            <span>{shirtDeal?.brand ?? "Shirt-Slot"}</span>
          </button>
        </aside>
      ) : null}
    </div>
  );
}

function StandBoardSlots({
  stand,
  deals,
  season,
  upgradeLevels,
  onOpenSlot,
}: {
  stand: SponsorStand;
  deals: readonly SponsorDeal[] | undefined;
  season: number;
  upgradeLevels?: Record<string, number>;
  onOpenSlot: (slotId: string) => void;
}) {
  const slots = sponsorSlotsForStand(stand, upgradeLevels);
  if (slots.length === 0) return null;
  return (
    <div className="stadium-card-boards" onClick={(event) => event.stopPropagation()}>
      {slots.map((slot) => {
        const deal = dealForSlot(deals, slot.id, season);
        return (
          <button
            key={slot.id}
            type="button"
            className={deal ? "stadium-card-board" : "stadium-card-board is-empty"}
            aria-label={deal ? `${slot.label}, ${deal.brand}` : `${slot.label}, Bande frei`}
            onClick={() => onOpenSlot(slot.id)}
          >
            {deal ? deal.brand : "Bande frei"}
          </button>
        );
      })}
    </div>
  );
}

function StadiumBlockCard({
  block,
  area,
  selected,
  deals,
  season,
  upgradeLevels,
  onSelect,
  onOpenSlot,
  onPriceChange,
}: {
  block: StadiumBlock;
  area: string;
  selected: boolean;
  deals: ClubStadium["sponsor_deals"];
  season: number;
  upgradeLevels?: Record<string, number>;
  onSelect: () => void;
  onOpenSlot: (slotId: string) => void;
  onPriceChange: (delta: number) => void;
}) {
  const sold = stadiumBlockAttendees(block);
  const income = Math.round(stadiumBlockIncome(block));
  const fillPct = Math.round(block.fill_rate * 100);
  const refPct = Math.round(referenceFillRate(block.id) * 100);
  const fillDeltaPts = Math.round(fillRateDeltaFromReference(block) * 100);
  const stand = block.id as SponsorStand;

  return (
    <article
      className={`stadium-block is-${block.tier}${selected ? " is-selected" : ""}`}
      data-area={area}
      onClick={onSelect}
    >
      <IsoStand tier={block.tier} />
      <div className="stadium-block-body">
        <h2>
          <span aria-hidden="true">{tierIcon(block.tier)}</span> {block.name}
        </h2>
        <p className="stadium-block-meta">
          {tierLabel(block.tier)} · {block.capacity.toLocaleString("de-DE")} Plätze
        </p>
        <FillMeter fillPct={fillPct} refPct={refPct} deltaPts={fillDeltaPts} sold={sold} />
        <div className="stadium-block-controls">
          <div className="stadium-price" onClick={(event) => event.stopPropagation()}>
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
          <StandBoardSlots
            stand={stand}
            deals={deals}
            season={season}
            upgradeLevels={upgradeLevels}
            onOpenSlot={onOpenSlot}
          />
        </div>
        <p className="stadium-block-income">Heimspiel {formatClubCash(income)}</p>
      </div>
    </article>
  );
}

function FillMeter({
  fillPct,
  refPct,
  deltaPts,
  sold,
}: {
  fillPct: number;
  refPct: number;
  deltaPts: number;
  sold: number;
}) {
  const tone = fillPct >= refPct - 2 ? "good" : fillPct >= refPct - 12 ? "warn" : "bad";
  return (
    <div className="stadium-fill">
      <div className="stadium-fill-head">
        <span>Auslastung</span>
        <span className="stadium-fill-value">
          {fillPct}%
          {deltaPts !== 0 ? (
            <span className={deltaPts > 0 ? "stadium-fill-delta is-up" : "stadium-fill-delta is-down"}>
              {deltaPts > 0 ? "+" : ""}
              {deltaPts}%
            </span>
          ) : (
            <span className="stadium-fill-ref">Basis {refPct}%</span>
          )}
        </span>
      </div>
      <div className="stadium-fill-track" aria-hidden="true">
        <span className="stadium-fill-ref-mark" style={{ left: `${refPct}%` }} />
        <span className={`stadium-fill-bar is-${tone}`} style={{ width: `${fillPct}%` }} />
      </div>
      <p className="stadium-fill-sold">~{sold.toLocaleString("de-DE")} Zuschauer</p>
    </div>
  );
}

function AcademyUpgradeSection({
  ownedId,
  stadiumCapacity,
  cash,
  onUpgrade,
}: {
  ownedId: AcademyFacility;
  stadiumCapacity: number;
  cash: number;
  onUpgrade: () => void;
}) {
  const owned = facilityById(ownedId);
  const buy = canBuyAcademyUpgrade(ownedId, stadiumCapacity, cash);
  const icons: Record<AcademyFacility, typeof Home> = {
    academy_basic: Home,
    academy_performance: Dumbbell,
    academy_elite: Star,
  };

  return (
    <>
      <h3 className="stadium-upgrade-category">Nachwuchs</h3>
      <p className="stadium-academy-strip">
        Campus Stufe {academyStage(ownedId)}/3 · Intake {hqIntakeCount(ownedId)} · {owned.name}
      </p>
      <ul className="stadium-upgrade-list">
        {ACADEMY_FACILITIES.map((facility) => {
          const gate = facilityGate(ownedId, facility.id, stadiumCapacity);
          const Icon = icons[facility.id];
          const isOwned = facility.id === ownedId;
          const isNext = buy.ok && buy.target === facility.id;
          return (
            <li key={facility.id} className="stadium-upgrade-card">
              <span className="stadium-upgrade-icon" aria-hidden="true">
                <Icon size={20} strokeWidth={2.5} />
              </span>
              <div className="stadium-upgrade-body">
                <strong>{facility.name}</strong>
                <p>{facility.effect}</p>
                <p className="stadium-upgrade-meta">
                  {isOwned
                    ? "Aktuell"
                    : gate.status === "needs_stadium"
                      ? `Stadion ${gate.capacity.toLocaleString("de-DE")} Plätze nötig`
                      : gate.status === "needs_performance"
                        ? "Leistungszentrum zuerst"
                        : facility.cost > 0
                          ? formatClubCash(facility.cost)
                          : "Basis"}
                </p>
              </div>
              {isNext ? (
                <button type="button" className="stadium-upgrade-buy" onClick={onUpgrade}>
                  Ausbauen
                </button>
              ) : isOwned ? (
                <span className="stadium-upgrade-owned">●</span>
              ) : (
                <span className="stadium-upgrade-owned">—</span>
              )}
            </li>
          );
        })}
      </ul>
    </>
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
