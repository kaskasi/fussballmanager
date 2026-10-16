import { useMemo, useState } from "react";
import { useT } from "../../i18n/react.ts";
import { COACH_TARGET } from "../../tutorial/tutorial-targets.ts";
import { useTutorialTabFocus } from "../tutorial/use-tutorial-tab-focus.ts";
import { Construction, Dumbbell, Hammer, Home, Shirt, Star, TriangleAlert } from "lucide-react";
import type { AcademyFacility } from "../../youth/intake-generator.ts";
import type { AcademyProject } from "../../sim/advance-construction.ts";
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
  matchdayCapacity,
  tierIcon,
  tierLabel,
  TICKET_PRICE_MAX,
  TICKET_PRICE_MIN,
  TICKET_PRICE_STEP,
  FILL_RATE_MIN,
  type ClubStadium,
  type StadiumBlock,
  type StadiumTier,
} from "../../stadium/club-stadium.ts";
import { formatClubCash, type ClubFinances } from "../../economy/club-finances.ts";
import {
  BLOCK_EXPANSION_MAX_LEVEL,
  blockCapacityAtExpansionLevel,
  blockExpansionLevel,
  blockExpansionWeeksRemaining,
  canStartBlockExpansion,
  isBlockUnderConstruction,
} from "../../stadium/stadium-block-expansion.ts";
import { infrastructureCostForWeek } from "../../economy/early-pacing.ts";
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
  STADIUM_MOOD_PHOTOS,
  stadiumPhotoTierFromCapacity,
} from "../assets/mood-photos.ts";
import { MoodPhotoBand } from "../components/MoodPhotoBand.tsx";
import { computeHospitalityPreview } from "../../stadium/hospitality.ts";
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

type StadiumTab = "plan" | "precinct";

/**
 * WIREFRAME: docs/prd/design.md §9.3 — Stadion
 * [Grundriss] [Gelände] — Ausbau im Grundriss
 * Banden sitzen auf den Tribünen-Karten um den Grundriss.
 * Klick = F6.5-Modal. Gelände: 🏟️ Mitte, 2×5-Plättchen, Startstraße Stadt→Arena.
 */
export function StadiumScreen({
  stadium,
  finances,
  season,
  week,
  isHomeMatchWeek,
  opponentFanbase,
  onStadiumChange,
  onStartBlockExpansion,
  onPlacePrecinct,
  onUpgradePrecinct,
  onBuyParcel,
  onPlaceStreet,
  onExpandPrecinct,
  onShrinkPrecinctToMin,
  onRemovePrecinctPatch,
  onRemoveStreet,
  precinctSeasonWeek,
  academyFacility,
  academyProject = null,
  onUpgradeAcademy,
}: {
  stadium: ClubStadium;
  finances: ClubFinances;
  season: number;
  week: number;
  isHomeMatchWeek: boolean;
  opponentFanbase: number;
  academyFacility?: AcademyFacility;
  academyProject?: AcademyProject | null;
  onUpgradeAcademy?: () => void;
  onStadiumChange: (stadium: ClubStadium) => void;
  onStartBlockExpansion: (blockId: string) => void;
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
  onRemovePrecinctPatch: (patchId: string) => void;
  onRemoveStreet: (x: number, y: number) => void;
  precinctSeasonWeek: number;
}) {
  const t = useT();
  const [tab, setTab] = useState<StadiumTab>("plan");
  useTutorialTabFocus("stadium", "stadium.precinct_not_3d", "precinct", setTab);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openSlotId, setOpenSlotId] = useState<string | null>(null);
  const capacity = matchdayCapacity(stadium, season, week);
  const moodPhoto = STADIUM_MOOD_PHOTOS[stadiumPhotoTierFromCapacity(capacity)];
  const matchdayIncome = stadiumMatchdayIncome(stadium);
  const avgTicket = stadiumAverageTicket(stadium);
  const fanbase = stadium.fanbase ?? DEFAULT_FANBASE;
  const mood = fanbaseMood(fanbase);
  const delta = stadium.fanbase_last_delta;
  const precinct = stadium.precinct ?? emptyPrecinct();
  const hospitalityPreview = useMemo(
    () =>
      computeHospitalityPreview({
        precinct,
        ownFanbase: fanbase,
        isHomeMatchWeek,
        opponentFanbase,
        season,
        week,
        restaurantViralUntilWeek: stadium.restaurant_viral_until_week,
        restaurantOvertimeWeek: stadium.restaurant_overtime_week,
      }),
    [
      fanbase,
      isHomeMatchWeek,
      opponentFanbase,
      precinct,
      season,
      stadium.restaurant_overtime_week,
      stadium.restaurant_viral_until_week,
      week,
    ],
  );
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

  const stadiumTabs: { id: StadiumTab; labelKey: string }[] = [
    { id: "plan", labelKey: "stadium.tab.plan" },
    { id: "precinct", labelKey: "stadium.tab.precinct" },
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
      <div
        className="fm-tab-bar"
        role="tablist"
        aria-label="Stadionbereiche"
        data-coach-target={COACH_TARGET.stadiumTabs}
      >
        {stadiumTabs.map(({ id, labelKey }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "fm-tab is-active" : "fm-tab"}
            onClick={() => setTab(id)}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {tab === "plan" ? (
        <div className="fm-tab-panel">
          {stadiumContext}
          <Hint
            text="Ticketpreis und Tribünen-Ausbau auf den Karten · leere Banden klicken für Sponsoring."
            block
          >
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
                  stadium={stadium}
                  block={block}
                  area={block.id}
                  selected={selectedId === block.id}
                  deals={stadium.sponsor_deals}
                  season={season}
                  week={week}
                  upgradeLevels={stadium.upgrade_levels}
                  onSelect={() => setSelectedId(block.id)}
                  onOpenSlot={setOpenSlotId}
                  onPriceChange={(delta) =>
                    onStadiumChange(adjustBlockTicketPrice(stadium, block.id, delta))
                  }
                  cash={finances.cash}
                  onStartExpansion={() => onStartBlockExpansion(block.id)}
                />
              );
            })}
            </section>
          </Hint>
          <StadiumUpgradesPanel
            finances={finances}
            capacity={capacity}
            academyFacility={academyFacility}
            academyProject={academyProject}
            onUpgradeAcademy={onUpgradeAcademy}
          />
        </div>
      ) : null}

      {tab === "precinct" ? (
        <div className="fm-tab-panel">
          {stadiumContext}
          <div data-coach-target={COACH_TARGET.stadiumPrecinct}>
          <PrecinctGrid
            precinct={precinct}
            cash={finances.cash}
            stadiumName={stadium.name}
            hospitalityPreview={hospitalityPreview}
            isHomeMatchWeek={isHomeMatchWeek}
            onPlace={onPlacePrecinct}
            onUpgrade={onUpgradePrecinct}
            onBuyParcel={onBuyParcel}
            onPlaceStreet={onPlaceStreet}
            onExpand={onExpandPrecinct}
            onShrinkToMin={onShrinkPrecinctToMin}
            onRemovePatch={onRemovePrecinctPatch}
            onRemoveStreet={onRemoveStreet}
            seasonWeek={precinctSeasonWeek}
          />
          </div>
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
  const t = useT();
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
            title={
              shirtDeal
                ? t("stadium.sponsor.shirtTitleOccupied", { brand: shirtDeal.brand })
                : t("stadium.sponsor.shirtTitleEmpty")
            }
            onClick={() => onOpenSlot(shirt.id)}
          >
            <Shirt size={18} aria-hidden="true" strokeWidth={2.5} />
            {!shirtDeal ? (
              <TriangleAlert size={14} strokeWidth={2.35} aria-hidden className="stadium-sponsor-warn-icon" />
            ) : null}
            <span>{shirtDeal?.brand ?? t("stadium.sponsor.shirtEmpty")}</span>
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
  const t = useT();
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
            aria-label={
              deal
                ? `${slot.label}, ${deal.brand}`
                : `${slot.label}, ${t("stadium.sponsor.boardEmpty")}`
            }
            onClick={() => onOpenSlot(slot.id)}
          >
            {!deal ? (
              <TriangleAlert size={14} strokeWidth={2.35} aria-hidden className="stadium-sponsor-warn-icon" />
            ) : null}
            {deal ? deal.brand : t("stadium.sponsor.boardEmpty")}
          </button>
        );
      })}
    </div>
  );
}

function StadiumBlockCard({
  stadium,
  block,
  area,
  selected,
  deals,
  season,
  week,
  upgradeLevels,
  onSelect,
  onOpenSlot,
  onPriceChange,
  cash,
  onStartExpansion,
}: {
  stadium: ClubStadium;
  block: StadiumBlock;
  area: string;
  selected: boolean;
  deals: ClubStadium["sponsor_deals"];
  season: number;
  week: number;
  upgradeLevels?: Record<string, number>;
  onSelect: () => void;
  onOpenSlot: (slotId: string) => void;
  onPriceChange: (delta: number) => void;
  cash: number;
  onStartExpansion: () => void;
}) {
  const sold = stadiumBlockAttendees(block);
  const income = Math.round(stadiumBlockIncome(stadium, block, season, week));
  const fillPct = Math.round(block.fill_rate * 100);
  const refPct = Math.round(referenceFillRate(block.id) * 100);
  const fillDeltaPts = Math.round(fillRateDeltaFromReference(block) * 100);
  const stand = block.id as SponsorStand;
  const expansionLevel = blockExpansionLevel(stadium, block.id);
  const underConstruction = isBlockUnderConstruction(stadium, block.id, season, week);
  const buildWeeksLeft = blockExpansionWeeksRemaining(stadium, block.id, season, week);
  const expansionCheck = canStartBlockExpansion(stadium, block.id, season, week, cash);
  const nextLevel = expansionCheck.nextLevel;
  const nextCapacity =
    nextLevel != null ? blockCapacityAtExpansionLevel(block.id, nextLevel) : null;
  const expansionCost =
    expansionCheck.cost != null ? infrastructureCostForWeek(expansionCheck.cost, week) : null;
  const expansionMaxed = expansionLevel >= BLOCK_EXPANSION_MAX_LEVEL && !underConstruction;

  return (
    <article
      className={`stadium-block is-${block.tier}${selected ? " is-selected" : ""}${underConstruction ? " is-constructing" : ""}`}
      data-area={area}
      onClick={onSelect}
    >
      <IsoStand tier={block.tier} />
      <div className="stadium-block-body">
        <h2>
          <span aria-hidden="true">{tierIcon(block.tier)}</span> {block.name}
        </h2>
        <p className="stadium-block-meta">
          {tierLabel(block.tier)} · Stufe {expansionLevel}/{BLOCK_EXPANSION_MAX_LEVEL} ·{" "}
          {(underConstruction
            ? 0
            : blockCapacityAtExpansionLevel(block.id, expansionLevel)
          ).toLocaleString("de-DE")}{" "}
          Plätze
        </p>
        <FillMeter
          fillPct={underConstruction ? 0 : fillPct}
          refPct={refPct}
          deltaPts={fillDeltaPts}
          sold={underConstruction ? 0 : sold}
        />
        <div className="stadium-block-controls">
          <div className="stadium-price" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              aria-label={`${block.name} Ticketpreis senken`}
              disabled={block.ticket_price_eur <= TICKET_PRICE_MIN}
              onClick={() => onPriceChange(-TICKET_PRICE_STEP)}
            >
              −
            </button>
            <span>€ {block.ticket_price_eur}</span>
            <button
              type="button"
              aria-label={`${block.name} Ticketpreis erhöhen`}
              disabled={block.ticket_price_eur >= TICKET_PRICE_MAX}
              onClick={() => onPriceChange(TICKET_PRICE_STEP)}
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
        <div
          className={`stadium-block-expansion${underConstruction ? " is-building" : ""}${expansionMaxed ? " is-maxed" : ""}`}
          onClick={(event) => event.stopPropagation()}
        >
          {underConstruction ? (
            <span className="stadium-block-expansion-status">
              <Construction size={14} strokeWidth={2.5} aria-hidden />
              Im Bau · noch {buildWeeksLeft} Woche{buildWeeksLeft === 1 ? "" : "n"} · kein Eintritt
            </span>
          ) : expansionMaxed ? (
            <span className="stadium-block-expansion-status">Ausbau voll ausgebaut</span>
          ) : (
            <>
              <span className="stadium-block-expansion-hint">
                {nextCapacity != null
                  ? `→ ${nextCapacity.toLocaleString("de-DE")} Plätze · ${expansionCheck.weeks ?? "?"} Wo. offline`
                  : null}
              </span>
              <button
                type="button"
                className="stadium-block-expansion-btn"
                disabled={!expansionCheck.allowed}
                title={
                  expansionCheck.reason ??
                  (expansionCost != null
                    ? `${formatClubCash(expansionCost)} · Stufe ${nextLevel}`
                    : undefined)
                }
                onClick={onStartExpansion}
              >
                <Hammer size={15} strokeWidth={2.5} aria-hidden />
                Ausbau
                {expansionCost != null ? ` ${formatClubCash(expansionCost)}` : ""}
              </button>
            </>
          )}
        </div>
        <p className="stadium-block-income">
          Heimspiel {underConstruction ? "— (Bau)" : formatClubCash(income)}
        </p>
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

function StadiumUpgradesPanel({
  finances,
  capacity,
  academyFacility,
  academyProject = null,
  onUpgradeAcademy,
}: {
  finances: ClubFinances;
  capacity: number;
  academyFacility?: AcademyFacility;
  academyProject?: AcademyProject | null;
  onUpgradeAcademy?: () => void;
}) {
  return (
    <section className="stadium-upgrades" aria-label="Stadionausbau">
      {academyFacility && onUpgradeAcademy ? (
        <AcademyUpgradeSection
          ownedId={academyFacility}
          academyProject={academyProject}
          stadiumCapacity={capacity}
          cash={finances.cash}
          onUpgrade={onUpgradeAcademy}
        />
      ) : null}
    </section>
  );
}

function AcademyUpgradeSection({
  ownedId,
  academyProject = null,
  stadiumCapacity,
  cash,
  onUpgrade,
}: {
  ownedId: AcademyFacility;
  academyProject?: AcademyProject | null;
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
      {academyProject ? (
        <p className="youth-camp-build-banner">
          <Construction size={16} strokeWidth={2.5} aria-hidden="true" />
          Campus im Bau — Intake bleibt bis zur Fertigstellung.
        </p>
      ) : null}
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
              {isNext && !academyProject ? (
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
