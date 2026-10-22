/** WIREFRAME: Finanzen · Tab Eintritt — read-only Tribünen-Auswertung (tc panels; prices and building live in Stadium) */
import { useMemo, useState } from "react";
import { Armchair, Crown, Users, type LucideIcon } from "lucide-react";
import {
  blockDisplayName,
  fillRateDeltaFromReference,
  stadiumBlockAttendees,
  stadiumBlockIncome,
  stadiumMatchdayIncome,
  tierLabel,
  type ClubStadium,
  type StadiumBlock,
  type StadiumTier,
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
import { formatWholeNumber } from "../../i18n/number-display.ts";
import { useT } from "../../i18n/react.ts";

const BLOCK_ORDER = ["north", "west", "east", "south", "vip"] as const;

const TIER_ICON: Record<StadiumTier, LucideIcon> = {
  standing: Users,
  seating: Armchair,
  vip: Crown,
};

/** Fill-rate band for the bar: below 60 % weak, 60–80 % fair, from 80 % good. */
function fillTone(fillRate: number): "good" | "mid" | "low" {
  if (fillRate >= 0.8) return "good";
  if (fillRate >= 0.6) return "mid";
  return "low";
}

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
  const t = useT();
  const fillPct = Math.round(block.fill_rate * 100);
  const deltaPts = Math.round(fillRateDeltaFromReference(block) * 100);
  const perMatch = Math.round(stadiumBlockIncome(stadium, block, season, week));
  const seasonBlock = blockSeasonTicketTotal(stadium, block, finances, season);
  const tone = fillTone(block.fill_rate);
  const Icon = TIER_ICON[block.tier] ?? Users;

  return (
    <button type="button" className="tc-panel tc-finances__stand" data-area={block.id} onClick={onOpen}>
      <span className="tc-finances__stand-head">
        <Icon className="tc-icon" aria-hidden />
        <strong>{blockDisplayName(block)}</strong>
        <span className="tc-caption">{tierLabel(block.tier)}</span>
      </span>
      <span className="tc-finances__headline">
        <strong>{formatClubCash(seasonBlock)}</strong> {t("finances.tickets.seasonSoFar")}
      </span>
      <span className="tc-finances__stand-fill">
        <span className="tc-bar" aria-hidden="true">
          <span
            className={tone === "good" ? "tc-bar__fill" : tone === "mid" ? "tc-bar__fill tc-bar__fill--warning" : "tc-bar__fill tc-finances__fill--out"}
            style={{ width: `${fillPct}%` }}
          />
        </span>
        <span className="tc-caption">
          {t("finances.tickets.fill", { percent: fillPct })}
          {deltaPts !== 0 ? (
            <span className={deltaPts > 0 ? "tc-delta--up" : "tc-delta--down"}>
              {" "}
              {t("finances.tickets.delta", { points: deltaPts > 0 ? `+${deltaPts}` : String(deltaPts) })}
            </span>
          ) : null}
        </span>
      </span>
      <span className="tc-caption">
        {t("finances.tickets.standMeta", {
          price: block.ticket_price_eur,
          fans: formatWholeNumber(stadiumBlockAttendees(block, stadium, season, week)),
          perMatch: formatClubCash(perMatch),
        })}
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
  const t = useT();
  const rows = useMemo(
    () => blockTicketRowsForSeason(stadium, block, finances, season),
    [block, stadium, finances, season],
  );
  const total = rows.reduce((sum, row) => sum + row.blockAmount, 0);
  const name = blockDisplayName(block);

  return (
    <ModalShell
      variant="tc"
      ariaLabel={t("finances.tickets.modalAria", { stand: name })}
      onClose={onClose}
      title={
        <>
          <span className="tc-label">{tierLabel(block.tier)}</span>
          <h2 className="tc-modal__title">{name}</h2>
          <p className="tc-modal__sub">{t("finances.tickets.modalLead", { season: formatSeasonLabel(season) })}</p>
        </>
      }
    >
      {rows.length === 0 ? (
        <p className="tc-empty">{t("finances.tickets.modalEmpty")}</p>
      ) : (
        <>
          <p className="tc-callout">
            {t("finances.tickets.modalSum", { amount: formatClubCash(total), count: rows.length })}
          </p>
          <ul className="tc-list">
            {rows.map((row) => (
              <li key={row.week} className="tc-list__item tc-list__item--wide">
                <span className="tc-list__main">
                  <span className="tc-list__name">{t("finances.tickets.week", { week: row.week })}</span>
                  <span className="tc-list__meta">{t("finances.tickets.gateTotal", { amount: formatClubCash(row.total) })}</span>
                </span>
                <span className="tc-list__value">~{formatClubCash(row.blockAmount)}</span>
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
  const t = useT();
  const [modalBlockId, setModalBlockId] = useState<string | null>(null);
  const matches = seasonHomeTicketMatches(finances, season);
  const seasonTotal = seasonTicketTotal(finances, season);
  const modelPerMatch = stadiumMatchdayIncome(stadium, season, week);
  const modalBlock = stadium.blocks.find((entry) => entry.id === modalBlockId);

  return (
    <div className="tc-stack" aria-label={t("finances.tickets.aria")}>
      <p className="tc-caption">{t("finances.tickets.lead")}</p>
      <dl className="tc-stats tc-finances__ticket-stats">
        <div className="tc-stats__item">
          <dt className="tc-label">{t("finances.tickets.seasonTotal", { season: formatSeasonLabel(season) })}</dt>
          <dd>
            <span className="tc-stat__value">{formatClubCash(seasonTotal)}</span>
            <span className="tc-caption">{t("finances.tickets.homeGames", { count: matches.length })}</span>
          </dd>
        </div>
        <div className="tc-stats__item">
          <dt className="tc-label">{t("finances.tickets.nextModel")}</dt>
          <dd>
            <span className="tc-stat__value">{formatClubCash(modelPerMatch)}</span>
          </dd>
        </div>
      </dl>
      <div className="tc-finances__arena" aria-label={t("finances.tickets.standsAria")}>
        <div className="tc-finances__pitch" aria-hidden="true" />
        {BLOCK_ORDER.map((id) => {
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
