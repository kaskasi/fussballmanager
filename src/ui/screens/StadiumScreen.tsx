import { useMemo, useState } from "react";
import { useT } from "../../i18n/react.ts";
import { COACH_TARGET } from "../../tutorial/tutorial-targets.ts";
import { useTutorialTabFocus } from "../tutorial/use-tutorial-tab-focus.ts";
import {
  Armchair,
  Check,
  Construction,
  Crown,
  Dumbbell,
  Flame,
  Hammer,
  Home,
  Megaphone,
  Minus,
  Plus,
  Shirt,
  Star,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AcademyFacility } from "../../youth/intake-generator.ts";
import {
  constructionCapacitySummary,
  constructionSnapshotFromSession,
  type AcademyProject,
} from "../../sim/advance-construction.ts";
import type { YouthCamp } from "../../youth/satellite-camps.ts";
import { ConstructionCapacityPanel } from "../components/ConstructionCapacityPanel.tsx";
import { FmScreenTab, FmScreenTabBar } from "../components/FmScreenTabBar.tsx";
import {
  ACADEMY_FACILITIES,
  academyFacilityEffect,
  academyFacilityName,
  academyStage,
  canBuyAcademyUpgrade,
  facilityGate,
} from "../../youth/academy.ts";
import { hqIntakeCount } from "../../youth/intake-generator.ts";
import {
  adjustBlockTicketPrice,
  blockDisplayName,
  fillRateDeltaFromReference,
  fillRateStrength,
  referenceFillRate,
  stadiumAverageTicket,
  stadiumBlockAttendees,
  stadiumBlockIncome,
  stadiumMatchdayIncome,
  matchdayCapacity,
  tierLabel,
  TICKET_PRICE_MAX,
  TICKET_PRICE_MIN,
  TICKET_PRICE_STEP,
  FILL_RATE_MIN,
  DEFAULT_FANBASE,
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
import { fanbaseMood, fanbaseMoodLabel, formatFanbase, type FanbaseMood } from "../../stadium/fanbase.ts";
import { PrecinctGrid } from "../components/PrecinctGrid.tsx";
import { SponsorDealModal } from "../components/SponsorDealModal.tsx";
import { STADIUM_MOOD_PHOTOS, stadiumPhotoTierFromCapacity } from "../assets/mood-photos.ts";
import { MoodPhotoBand } from "../components/MoodPhotoBand.tsx";
import { computeHospitalityPreview } from "../../stadium/hospitality.ts";
import { emptyPrecinct, type PrecinctBuilding, type PrecinctEdge } from "../../stadium/precinct.ts";
import {
  dealForSlot,
  signSponsorDeal,
  sponsorSlotLabel,
  sponsorSlotsForStand,
  takenSponsorBrandKeys,
  SPONSOR_SLOTS,
  type SponsorOffer,
  type SponsorStand,
} from "../../stadium/sponsor-deals.ts";
import { formatDecimal, formatWholeNumber } from "../../i18n/number-display.ts";

type StadiumTab = "plan" | "precinct" | "upgrades";

const BLOCK_ORDER = ["north", "west", "east", "south", "vip"] as const;

const TIER_ICON: Record<StadiumTier, LucideIcon> = {
  standing: Users,
  seating: Armchair,
  vip: Crown,
};

const MOOD_ICON: Record<FanbaseMood, LucideIcon> = {
  strong: Flame,
  growing: TrendingUp,
  steady: Users,
  weak: TrendingDown,
};

/**
 * WIREFRAME: docs/prd/design.md §9.3 — Stadion ("Umsetzung")
 * Stat strip over all tabs → Grundriss (plan + sector detail) · Gelände (building grid) · Ausbau (upgrade cards).
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
  youthCamps = [],
  onUpgradeAcademy,
}: {
  stadium: ClubStadium;
  finances: ClubFinances;
  season: number;
  week: number;
  youthCamps?: readonly YouthCamp[];
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
  const [selectedId, setSelectedId] = useState<string>("north");
  const [openSlotId, setOpenSlotId] = useState<string | null>(null);
  const capacity = matchdayCapacity(stadium, season, week);
  const moodPhoto = STADIUM_MOOD_PHOTOS[stadiumPhotoTierFromCapacity(capacity)];
  const matchdayIncome = stadiumMatchdayIncome(stadium, season, week);
  const avgTicket = stadiumAverageTicket(stadium, season, week);
  const fanbase = stadium.fanbase ?? DEFAULT_FANBASE;
  const mood = fanbaseMood(fanbase);
  const MoodIcon = MOOD_ICON[mood];
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

  const constructionSnapshot = useMemo(
    () => constructionSnapshotFromSession({ stadium, youthCamps, academyProject, season, week }),
    [academyProject, season, stadium, week, youthCamps],
  );
  const constructionSummary = useMemo(
    () => constructionCapacitySummary(constructionSnapshot),
    [constructionSnapshot],
  );
  const selectedBlock = stadium.blocks.find((block) => block.id === selectedId) ?? stadium.blocks[0];

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
    { id: "upgrades", labelKey: "stadium.tab.upgrades" },
  ];

  return (
    <main className="stadium club-shell-card-body">
      <FmScreenTabBar role="tablist" aria-label={t("stadium.tabsAria")} data-coach-target={COACH_TARGET.stadiumTabs}>
        {stadiumTabs.map(({ id, labelKey }) => (
          <FmScreenTab
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "is-active" : undefined}
            onClick={() => setTab(id)}
          >
            {t(labelKey)}
          </FmScreenTab>
        ))}
      </FmScreenTabBar>

      <div className="fm-tab-panel">
        <header className="tc-page-head tc-stadium__head">
          <span className="tc-label">{t("stadium.eyebrow")}</span>
          <h1 className="tc-page-title">{stadium.name}</h1>
          <p className="tc-page-sub tc-stadium__strip">
            <span>{t("stadium.strip.seats", { seats: formatWholeNumber(capacity) })}</span>
            <span>{t("stadium.strip.avgTicket", { price: formatWholeNumber(Math.round(avgTicket)) })}</span>
            <span>{t("stadium.strip.homeGate", { amount: formatClubCash(matchdayIncome) })}</span>
            <span className="tc-stadium__fanbase" title={t("stadium.fanbase.hint")}>
              <MoodIcon className="tc-icon" aria-hidden />
              {t("stadium.strip.fanbase", { value: formatFanbase(fanbase), mood: fanbaseMoodLabel(mood) })}
              {delta != null && delta !== 0 ? (
                <span className={delta > 0 ? "tc-delta--up" : "tc-delta--down"}>
                  {t("stadium.strip.fanbaseDelta", { delta: `${delta > 0 ? "+" : ""}${formatDecimal(delta, 1)}` })}
                </span>
              ) : null}
            </span>
          </p>
        </header>

        {constructionSummary.atCap ? (
          <ConstructionCapacityPanel snapshot={constructionSnapshot} hero />
        ) : (
          <>
            {constructionSummary.active > 0 ? <ConstructionCapacityPanel snapshot={constructionSnapshot} compact /> : null}
            <MoodPhotoBand src={moodPhoto} className="tc-stadium__photo" />
          </>
        )}

        {tab === "plan" && selectedBlock ? (
          <div className="tc-split tc-stadium__plan">
            <section className="tc-panel" aria-labelledby="stadium-plan-title">
              <div className="tc-panel__head">
                <h2 className="tc-label" id="stadium-plan-title">
                  {t("stadium.plan.title")}
                </h2>
                <span className="tc-caption">{t("stadium.plan.hint")}</span>
              </div>
              <StadiumPitchPlan
                blocks={stadium.blocks}
                deals={stadium.sponsor_deals}
                season={season}
                selectedId={selectedBlock.id}
                onSelect={setSelectedId}
                onOpenSlot={setOpenSlotId}
              />
            </section>
            <SectorDetail
              stadium={stadium}
              block={selectedBlock}
              season={season}
              week={week}
              onOpenSlot={setOpenSlotId}
              onPriceChange={(change) => onStadiumChange(adjustBlockTicketPrice(stadium, selectedBlock.id, change))}
            />
          </div>
        ) : null}

        {tab === "precinct" ? (
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
              season={season}
              week={week}
            />
          </div>
        ) : null}

        {tab === "upgrades" ? (
          <div className="tc-stack">
            <section className="tc-panel" aria-labelledby="stadium-stands-title">
              <div className="tc-panel__head">
                <h2 className="tc-panel__title" id="stadium-stands-title">
                  {t("stadium.upgrades.standsTitle")}
                </h2>
                <span className="tc-caption">{t("stadium.upgrades.standsHint")}</span>
              </div>
              <ul className="tc-stadium__upgrades">
                {BLOCK_ORDER.map((id) => {
                  const block = stadium.blocks.find((entry) => entry.id === id);
                  if (!block) return null;
                  return (
                    <StandExpansionCard
                      key={id}
                      stadium={stadium}
                      block={block}
                      season={season}
                      week={week}
                      cash={finances.cash}
                      onStart={() => onStartBlockExpansion(block.id)}
                    />
                  );
                })}
              </ul>
            </section>
            {academyFacility && onUpgradeAcademy ? (
              <AcademyUpgradeSection
                ownedId={academyFacility}
                academyProject={academyProject}
                stadiumCapacity={capacity}
                cash={finances.cash}
                onUpgrade={onUpgradeAcademy}
              />
            ) : null}
          </div>
        ) : null}
      </div>

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

const PLAN_ZONES: Array<{ id: string; x: number; y: number; w: number; h: number }> = [
  { id: "north", x: 24, y: 8, w: 272, h: 44 },
  { id: "south", x: 24, y: 228, w: 200, h: 44 },
  { id: "west", x: 8, y: 58, w: 44, h: 164 },
  { id: "east", x: 268, y: 58, w: 44, h: 164 },
  { id: "vip", x: 232, y: 228, w: 64, h: 44 },
];

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
  selectedId: string;
  onSelect: (blockId: string) => void;
  onOpenSlot: (slotId: string) => void;
}) {
  const t = useT();
  const byId = Object.fromEntries(blocks.map((block) => [block.id, block]));
  const shirt = SPONSOR_SLOTS.find((slot) => slot.kind === "shirt");
  const shirtDeal = shirt ? dealForSlot(deals, shirt.id, season) : undefined;

  return (
    <div className="tc-stadium__map">
      <svg className="tc-stadium__svg" viewBox="0 0 320 280" role="group" aria-label={t("stadium.plan.aria")}>
        <rect className="tc-stadium__pitch" x="58" y="58" width="204" height="164" rx="8" />
        <circle className="tc-stadium__marking" cx="160" cy="140" r="28" />
        <line className="tc-stadium__marking" x1="160" y1="58" x2="160" y2="222" />
        {PLAN_ZONES.map((zone) => {
          const block = byId[zone.id];
          if (!block) return null;
          const fillPct = Math.round(block.fill_rate * 100);
          const selected = selectedId === zone.id;
          const name = blockDisplayName(block);
          return (
            <g key={zone.id}>
              <rect
                x={zone.x}
                y={zone.y}
                width={zone.w}
                height={zone.h}
                rx={6}
                className={selected ? "tc-stadium__zone tc-stadium__zone--selected" : "tc-stadium__zone"}
                style={{ fillOpacity: 0.2 + 0.65 * fillRateStrength(block.fill_rate ?? FILL_RATE_MIN) }}
                onClick={() => onSelect(zone.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(zone.id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                aria-label={t("stadium.plan.zoneAria", { stand: name, percent: fillPct })}
              >
                <title>{t("stadium.plan.zoneAria", { stand: name, percent: fillPct })}</title>
              </rect>
              <text
                x={zone.x + zone.w / 2}
                y={zone.y + zone.h / 2 + 4}
                textAnchor="middle"
                className="tc-stadium__zone-label"
                pointerEvents="none"
              >
                {t(`stadium.plan.short.${zone.id}`)}
              </text>
            </g>
          );
        })}
      </svg>
      {shirt ? (
        <button
          type="button"
          className="tc-chip tc-chip--dense tc-chip--icon tc-stadium__shirt"
          aria-pressed={Boolean(shirtDeal)}
          title={
            shirtDeal
              ? t("stadium.sponsor.shirtTitleOccupied", { brand: shirtDeal.brand })
              : t("stadium.sponsor.shirtTitleEmpty")
          }
          onClick={() => onOpenSlot(shirt.id)}
        >
          <Shirt className="tc-icon" aria-hidden />
          {!shirtDeal ? <TriangleAlert className="tc-icon tc-stadium__warn" aria-hidden /> : null}
          {shirtDeal?.brand ?? t("stadium.sponsor.shirtEmpty")}
        </button>
      ) : null}
    </div>
  );
}

function SectorDetail({
  stadium,
  block,
  season,
  week,
  onOpenSlot,
  onPriceChange,
}: {
  stadium: ClubStadium;
  block: StadiumBlock;
  season: number;
  week: number;
  onOpenSlot: (slotId: string) => void;
  onPriceChange: (delta: number) => void;
}) {
  const t = useT();
  const underConstruction = isBlockUnderConstruction(stadium, block.id, season, week);
  const buildWeeksLeft = blockExpansionWeeksRemaining(stadium, block.id, season, week);
  const level = blockExpansionLevel(stadium, block.id);
  const seats = underConstruction ? 0 : blockCapacityAtExpansionLevel(block.id, level);
  const sold = underConstruction ? 0 : stadiumBlockAttendees(block, stadium, season, week);
  const income = underConstruction ? 0 : Math.round(stadiumBlockIncome(stadium, block, season, week));
  const fillPct = underConstruction ? 0 : Math.round(block.fill_rate * 100);
  const refPct = Math.round(referenceFillRate(block.id) * 100);
  const deltaPts = Math.round(fillRateDeltaFromReference(block) * 100);
  const tone = fillPct >= refPct - 2 ? "good" : fillPct >= refPct - 12 ? "mid" : "low";
  const Icon = TIER_ICON[block.tier] ?? Users;
  const name = blockDisplayName(block);
  const slots = sponsorSlotsForStand(block.id as SponsorStand, stadium.upgrade_levels);

  return (
    <section className="tc-panel tc-stadium__detail" aria-labelledby="stadium-sector-title" aria-live="polite">
      <div className="tc-stadium__detail-head">
        <Icon className="tc-icon" aria-hidden />
        <div>
          <h2 className="tc-panel__title" id="stadium-sector-title">
            {name}
          </h2>
          <p className="tc-caption">
            {t("stadium.sector.meta", { tier: tierLabel(block.tier), seats: formatWholeNumber(seats) })}
          </p>
        </div>
      </div>

      {underConstruction ? (
        <p className="tc-callout tc-callout--warn">{buildingLabel(t, buildWeeksLeft)}</p>
      ) : null}

      <div className="tc-stadium__fill">
        <div className="tc-stadium__fill-head">
          <span className="tc-label">{t("stadium.sector.fill")}</span>
          <span className="tc-strong">
            {t("finances.percent", { value: fillPct })}{" "}
            {deltaPts !== 0 ? (
              <span className={deltaPts > 0 ? "tc-delta--up" : "tc-delta--down"}>
                {t("stadium.sector.fillDelta", { points: `${deltaPts > 0 ? "+" : ""}${deltaPts}` })}
              </span>
            ) : (
              <span className="tc-caption">{t("stadium.sector.fillBase", { percent: refPct })}</span>
            )}
          </span>
        </div>
        <span className="tc-bar tc-stadium__bar" aria-hidden="true">
          <span
            className={tone === "good" ? "tc-bar__fill" : tone === "mid" ? "tc-bar__fill tc-bar__fill--warning" : "tc-bar__fill tc-stadium__fill--low"}
            style={{ width: `${fillPct}%` }}
          />
          <span className="tc-stadium__ref" style={{ left: `${refPct}%` }} />
        </span>
        <p className="tc-caption">{t("stadium.sector.spectators", { count: formatWholeNumber(sold) })}</p>
      </div>

      <div className="tc-stadium__row">
        <span className="tc-label">{t("stadium.sector.price")}</span>
        <div className="tc-stepper">
          <button
            type="button"
            className="tc-iconbtn"
            aria-label={t("stadium.sector.priceLower", { stand: name })}
            disabled={block.ticket_price_eur <= TICKET_PRICE_MIN}
            onClick={() => onPriceChange(-TICKET_PRICE_STEP)}
          >
            <Minus className="tc-icon" aria-hidden />
          </button>
          <output className="tc-stepper__value">{t("finances.price.value", { amount: formatWholeNumber(block.ticket_price_eur) })}</output>
          <button
            type="button"
            className="tc-iconbtn"
            aria-label={t("stadium.sector.priceRaise", { stand: name })}
            disabled={block.ticket_price_eur >= TICKET_PRICE_MAX}
            onClick={() => onPriceChange(TICKET_PRICE_STEP)}
          >
            <Plus className="tc-icon" aria-hidden />
          </button>
        </div>
      </div>

      {slots.length > 0 ? (
        <div className="tc-stadium__row">
          <span className="tc-label">{t("stadium.sector.boards")}</span>
          <div className="tc-chips">
            {slots.map((slot) => {
              const deal = dealForSlot(stadium.sponsor_deals, slot.id, season);
              const label = sponsorSlotLabel(slot);
              return (
                <button
                  key={slot.id}
                  type="button"
                  className="tc-chip tc-chip--dense tc-chip--icon"
                  aria-pressed={Boolean(deal)}
                  aria-label={deal ? `${label}, ${deal.brand}` : `${label}, ${t("stadium.sponsor.boardEmpty")}`}
                  onClick={() => onOpenSlot(slot.id)}
                >
                  {deal ? <Megaphone className="tc-icon" aria-hidden /> : <TriangleAlert className="tc-icon tc-stadium__warn" aria-hidden />}
                  {deal ? deal.brand : t("stadium.sponsor.boardEmpty")}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="tc-stadium__gate">
        <span className="tc-label">{t("stadium.sector.gate")}</span>
        <strong>{underConstruction ? "—" : formatClubCash(income)}</strong>
      </div>
    </section>
  );
}

function buildingLabel(t: ReturnType<typeof useT>, weeks: number): string {
  return weeks === 1 ? t("stadium.sector.buildingOne") : t("stadium.sector.building", { weeks });
}

function LevelDots({ level, max }: { level: number; max: number }) {
  const t = useT();
  return (
    <span className="tc-stadium__dots" role="img" aria-label={t("stadium.upgrades.level", { level, max })}>
      {Array.from({ length: max }, (_, index) => (
        <span key={index} className={index < level ? "tc-stadium__dot tc-stadium__dot--on" : "tc-stadium__dot"} />
      ))}
    </span>
  );
}

function StandExpansionCard({
  stadium,
  block,
  season,
  week,
  cash,
  onStart,
}: {
  stadium: ClubStadium;
  block: StadiumBlock;
  season: number;
  week: number;
  cash: number;
  onStart: () => void;
}) {
  const t = useT();
  const level = blockExpansionLevel(stadium, block.id);
  const underConstruction = isBlockUnderConstruction(stadium, block.id, season, week);
  const buildWeeksLeft = blockExpansionWeeksRemaining(stadium, block.id, season, week);
  const check = canStartBlockExpansion(stadium, block.id, season, week, cash);
  const nextCapacity = check.nextLevel != null ? blockCapacityAtExpansionLevel(block.id, check.nextLevel) : null;
  const cost = check.cost != null ? infrastructureCostForWeek(check.cost, week) : null;
  const maxed = level >= BLOCK_EXPANSION_MAX_LEVEL && !underConstruction;
  const Icon = TIER_ICON[block.tier] ?? Users;
  const name = blockDisplayName(block);

  return (
    <li className={maxed ? "tc-card tc-stadium__upgrade tc-stadium__upgrade--done" : "tc-card tc-stadium__upgrade"}>
      <div className="tc-stadium__upgrade-main">
        <p className="tc-card__title">
          <Icon className="tc-icon" aria-hidden />
          <span className="tc-strong">{name}</span>
          <span className="tc-caption">{tierLabel(block.tier)}</span>
        </p>
        <LevelDots level={level} max={BLOCK_EXPANSION_MAX_LEVEL} />
        {underConstruction ? (
          <p className="tc-callout tc-callout--warn">{buildingLabel(t, buildWeeksLeft)}</p>
        ) : maxed ? (
          <p className="tc-caption">{t("stadium.upgrades.maxed")}</p>
        ) : (
          <p className="tc-caption">
            {nextCapacity != null
              ? t("stadium.upgrades.next", {
                  seats: formatWholeNumber(nextCapacity),
                  weeks: check.weeks ?? "?",
                })
              : null}
          </p>
        )}
        {!maxed && !underConstruction && !check.allowed && check.reason ? (
          <p className="tc-caption tc-stadium__reason">{check.reason}</p>
        ) : null}
      </div>
      {maxed ? (
        <Check className="tc-icon tc-stadium__done" aria-label={t("stadium.upgrades.maxed")} />
      ) : underConstruction ? null : (
        <button type="button" className="tc-btn" disabled={!check.allowed} onClick={onStart}>
          <Hammer className="tc-icon" aria-hidden />
          {cost != null ? t("stadium.upgrades.expandFor", { amount: formatClubCash(cost) }) : t("stadium.upgrades.expand")}
        </button>
      )}
    </li>
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
  const t = useT();
  const buy = canBuyAcademyUpgrade(ownedId, stadiumCapacity, cash);
  const icons: Record<AcademyFacility, LucideIcon> = {
    academy_basic: Home,
    academy_performance: Dumbbell,
    academy_elite: Star,
  };

  return (
    <section className="tc-panel" aria-labelledby="stadium-academy-title">
      <div className="tc-panel__head">
        <h2 className="tc-panel__title" id="stadium-academy-title">
          {t("stadium.academy.title")}
        </h2>
        <span className="tc-caption">
          {t("stadium.academy.strip", {
            stage: academyStage(ownedId),
            intake: hqIntakeCount(ownedId),
            name: academyFacilityName(ownedId),
          })}
        </span>
      </div>
      {academyProject ? (
        <p className="tc-callout tc-callout--warn tc-stadium__academy-note">
          <Construction className="tc-icon" aria-hidden /> {t("stadium.academy.building")}
        </p>
      ) : null}
      <ul className="tc-stadium__upgrades">
        {ACADEMY_FACILITIES.map((facility) => {
          const gate = facilityGate(ownedId, facility.id, stadiumCapacity);
          const Icon = icons[facility.id];
          const isOwned = facility.id === ownedId;
          const isNext = buy.ok && buy.target === facility.id;
          const status = isOwned
            ? t("stadium.academy.current")
            : gate.status === "needs_stadium"
              ? t("stadium.academy.needsStadium", { seats: formatWholeNumber(gate.capacity) })
              : gate.status === "needs_performance"
                ? t("stadium.academy.needsPrevious")
                : facility.cost > 0
                  ? formatClubCash(facility.cost)
                  : t("stadium.academy.base");
          return (
            <li
              key={facility.id}
              className={isOwned ? "tc-card tc-stadium__upgrade tc-stadium__upgrade--done" : "tc-card tc-stadium__upgrade"}
            >
              <div className="tc-stadium__upgrade-main">
                <p className="tc-card__title">
                  <Icon className="tc-icon" aria-hidden />
                  <span className="tc-strong">{academyFacilityName(facility.id)}</span>
                </p>
                <p className="tc-caption">{academyFacilityEffect(facility.id)}</p>
                <p className="tc-caption tc-strong">{status}</p>
                {!buy.ok && buy.reason && gate.status === "open" && facility.id === nextAcademyTarget(ownedId) ? (
                  <p className="tc-caption tc-stadium__reason">{buy.reason}</p>
                ) : null}
              </div>
              {isNext && !academyProject ? (
                <button type="button" className="tc-btn tc-btn--primary" onClick={onUpgrade}>
                  {t("stadium.academy.upgrade")}
                </button>
              ) : isOwned ? (
                <Check className="tc-icon tc-stadium__done" aria-label={t("stadium.academy.current")} />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function nextAcademyTarget(owned: AcademyFacility): AcademyFacility | null {
  const index = ACADEMY_FACILITIES.findIndex((facility) => facility.id === owned);
  return ACADEMY_FACILITIES[index + 1]?.id ?? null;
}
