import { useCallback } from "react";
import type { GameSession } from "../../persistence/game-session.ts";
import type { ClubFinances } from "../../economy/club-finances.ts";
import {
  creditClubCash,
  spendClubCash,
  weeklyWageBill,
  leagueTablePlace,
} from "../../economy/club-finances.ts";
import { drawBankLoan, evaluateBankLoan } from "../../economy/financing.ts";
import type { DivisionEconomyId } from "../../economy/division-economy.ts";
import { infrastructureCostForWeek } from "../../economy/early-pacing.ts";
import { weeksOfWages } from "../../economy/spend-runway.ts";
import {
  normalizeClubStadium,
  stadiumTotalCapacity,
  STADIUM_BASE_BLOCKS,
  type ClubStadium,
} from "../../stadium/club-stadium.ts";
import {
  canPurchaseStadiumUpgrade,
  purchaseStadiumUpgrade,
  stadiumUpgradeCatalog,
} from "../../stadium/stadium-upgrades.ts";
import {
  canStartBlockExpansion,
  startBlockExpansion,
} from "../../stadium/stadium-block-expansion.ts";
import {
  buyPrecinctExpansion,
  canBuyPrecinctExpansion,
  canNudgePrecinctPatch,
  canUpgradePrecinctBuilding,
  emptyPrecinct,
  nudgePrecinctPatch,
  placePrecinctBuilding,
  placeStreetRun,
  removePrecinctPatch,
  removeStreetCell,
  precinctPlacementCost,
  PRECINCT_BUILDINGS,
  shrinkPrecinctPatchToMin,
  upgradePrecinctBuilding,
  occupiedCells,
  type PrecinctBuilding,
  type PrecinctEdge,
} from "../../stadium/precinct.ts";
import { applyRestaurantProposalStory } from "../../stadium/precinct-campus-events.ts";
import { canBuyAcademyUpgrade, ACADEMY_FACILITIES } from "../../youth/academy.ts";
import type { AcademyFacility } from "../../youth/intake-generator.ts";
import { withClubEvent } from "../../inbox/club-events.ts";
import { t } from "../../i18n/index.ts";
import { trackEvent } from "../../telemetry/analytics.ts";

type PatchSession = (updater: (current: GameSession) => GameSession) => void;

type RequestClubSpend = (
  cost: number,
  title: string,
  apply: (current: GameSession) => GameSession,
  options?: { infrastructure?: boolean },
) => void;

export function useStadiumActions(args: {
  stadium: ClubStadium;
  finances: ClubFinances;
  academyFacility: AcademyFacility;
  season: number;
  week: number;
  patchSession: PatchSession;
  requestClubSpend: RequestClubSpend;
}) {
  const {
    stadium,
    finances,
    academyFacility,
    season,
    week,
    patchSession,
    requestClubSpend,
  } = args;

  const handleDrawBankLoan = useCallback(
    (amount: number) => {
      patchSession((current) => {
        const wageBill = weeklyWageBill(current.players, current.clubId);
        const eligibility = evaluateBankLoan({
          finances: current.finances,
          wageBillWeekly: wageBill,
          runwayWeeks: weeksOfWages(current.finances.cash, wageBill),
          leaguePlace: leagueTablePlace(current.league),
          leagueSize: current.league.club_ids.length,
          boardPressure: current.board.pressure,
          divisionId: current.league.division_id as DivisionEconomyId,
          financing: current.financing,
          season: current.season,
          week: current.week,
        });
        const drawn = drawBankLoan(
          current.finances,
          current.financing,
          amount,
          eligibility,
          current.season,
          current.week,
        );
        if (!drawn) return current;
        return {
          ...current,
          finances: drawn.finances,
          financing: drawn.financing,
        };
      });
      trackEvent("bank_loan_drawn", { amount });
    },
    [patchSession],
  );

  const handlePurchaseStadiumUpgrade = useCallback(
    (upgradeId: string) => {
      const check = canPurchaseStadiumUpgrade(stadium, finances, upgradeId);
      if (!check.allowed || check.cost === undefined) return;
      const def = stadiumUpgradeCatalog().find((entry) => entry.id === upgradeId);
      const quoted = infrastructureCostForWeek(check.cost, week);
      requestClubSpend(
        quoted,
        def ? `${def.icon} ${def.name}` : "Tribünen-Ausbau",
        (current) => {
          const recheck = canPurchaseStadiumUpgrade(current.stadium, current.finances, upgradeId);
          if (!recheck.allowed || recheck.cost === undefined) return current;
          const fee = infrastructureCostForWeek(recheck.cost, current.week);
          const result = purchaseStadiumUpgrade(
            current.stadium,
            current.finances,
            upgradeId,
            STADIUM_BASE_BLOCKS,
            current.week,
            fee,
          );
          if (!result.ok) return current;
          return {
            ...current,
            stadium: normalizeClubStadium(result.stadium),
            finances: result.finances,
          };
        },
        { infrastructure: true },
      );
      trackEvent("stadium_upgrade_purchased", { upgrade_id: upgradeId });
    },
    [finances, requestClubSpend, stadium, week],
  );

  const handleStartBlockExpansion = useCallback(
    (blockId: string) => {
      const block = stadium.blocks.find((entry) => entry.id === blockId);
      const check = canStartBlockExpansion(stadium, blockId, season, week, finances.cash);
      if (!check.allowed || check.cost === undefined) return;
      const quoted = infrastructureCostForWeek(check.cost, week);
      requestClubSpend(
        quoted,
        block ? `${block.name} · Stufe ${check.nextLevel}` : "Tribünen-Ausbau",
        (current) => {
          const recheck = canStartBlockExpansion(
            current.stadium,
            blockId,
            current.season,
            current.week,
            current.finances.cash,
          );
          if (!recheck.allowed || recheck.cost === undefined) return current;
          const fee = infrastructureCostForWeek(recheck.cost, current.week);
          if (fee > current.finances.cash) return current;
          return {
            ...current,
            stadium: normalizeClubStadium(
              startBlockExpansion(current.stadium, blockId, current.season, current.week),
            ),
            finances: spendClubCash(current.finances, fee, current.week),
          };
        },
        { infrastructure: true },
      );
    },
    [finances.cash, requestClubSpend, season, stadium, week],
  );

  const handlePlacePrecinct = useCallback(
    (building: PrecinctBuilding, x: number, y: number, from?: { x: number; y: number }) => {
      const precinct = stadium.precinct ?? emptyPrecinct();
      const baseCost = precinctPlacementCost(precinct, building, from);
      const cost = infrastructureCostForWeek(baseCost, week);
      if (cost > finances.cash) return;
      const def = PRECINCT_BUILDINGS.find((entry) => entry.id === building);
      requestClubSpend(
        cost,
        def ? `${def.icon} ${def.label}` : "Gelände",
        (current) => {
          const currentPrecinct = current.stadium.precinct ?? emptyPrecinct();
          const actualBase = precinctPlacementCost(currentPrecinct, building, from);
          const actualCost = infrastructureCostForWeek(actualBase, current.week);
          if (actualCost > current.finances.cash) return current;
          const hadRestaurant = occupiedCells(currentPrecinct, "restaurant") > 0;
          const nextPrecinct = placePrecinctBuilding(currentPrecinct, x, y, building, from);
          if (nextPrecinct === currentPrecinct) return current;
          let nextStadium = normalizeClubStadium({ ...current.stadium, precinct: nextPrecinct });
          let nextPlayers = current.players;
          let nextClubEvents = current.clubEvents;
          if (building === "restaurant" && !hadRestaurant) {
            const story = applyRestaurantProposalStory(
              nextStadium,
              current.players,
              current.clubId,
              current.season,
              current.week,
            );
            nextStadium = normalizeClubStadium(story.stadium);
            nextPlayers = [...story.players];
            nextClubEvents = withClubEvent(
              nextClubEvents,
              current.season,
              current.week,
              "info",
              story.clubEventMessage,
            );
          }
          return {
            ...current,
            stadium: nextStadium,
            players: nextPlayers,
            clubEvents: nextClubEvents,
            finances:
              actualCost === 0
                ? current.finances
                : spendClubCash(current.finances, actualCost, current.week),
          };
        },
        { infrastructure: true },
      );
    },
    [finances.cash, requestClubSpend, stadium.precinct, week],
  );

  const handleUpgradeAcademy = useCallback(() => {
    const check = canBuyAcademyUpgrade(
      academyFacility,
      stadiumTotalCapacity(stadium),
      finances.cash,
    );
    if (!check.ok) return;
    const def = ACADEMY_FACILITIES.find((entry) => entry.id === check.target);
    requestClubSpend(check.cost, def ? `${def.icon} ${def.name}` : "Jugend-Campus", (current) => {
      const next = canBuyAcademyUpgrade(
        current.academyFacility,
        stadiumTotalCapacity(current.stadium),
        current.finances.cash,
      );
      if (!next.ok) return current;
      return {
        ...current,
        academyFacility: next.target,
        finances: spendClubCash(current.finances, next.cost, current.week),
      };
    });
    trackEvent("academy_upgraded", { facility: check.target });
  }, [academyFacility, finances.cash, requestClubSpend, stadium]);

  const handleUpgradePrecinct = useCallback(
    (building: PrecinctBuilding) => {
      const precinct = stadium.precinct ?? emptyPrecinct();
      const check = canUpgradePrecinctBuilding(precinct, building, finances.cash);
      if (!check.allowed) return;
      const def = PRECINCT_BUILDINGS.find((entry) => entry.id === building);
      const quoted = infrastructureCostForWeek(check.cost, week);
      requestClubSpend(
        quoted,
        def ? `${def.icon} ${def.label} Ausbau` : "Gelände-Ausbau",
        (current) => {
          const currentPrecinct = current.stadium.precinct ?? emptyPrecinct();
          const nextCheck = canUpgradePrecinctBuilding(currentPrecinct, building, current.finances.cash);
          if (!nextCheck.allowed) return current;
          const fee = infrastructureCostForWeek(nextCheck.cost, current.week);
          return {
            ...current,
            stadium: normalizeClubStadium({
              ...current.stadium,
              precinct: upgradePrecinctBuilding(currentPrecinct, building),
            }),
            finances: spendClubCash(current.finances, fee, current.week),
          };
        },
        { infrastructure: true },
      );
    },
    [finances.cash, requestClubSpend, stadium.precinct, week],
  );

  const handleBuyParcel = useCallback(() => {
    const precinct = stadium.precinct ?? emptyPrecinct();
    const check = canBuyPrecinctExpansion(precinct, finances.cash);
    if (!check.allowed) return;
    const quoted = infrastructureCostForWeek(check.cost, week);
    requestClubSpend(
      quoted,
      t("spend.precinctExpansion"),
      (current) => {
        const currentPrecinct = current.stadium.precinct ?? emptyPrecinct();
        const nextCheck = canBuyPrecinctExpansion(currentPrecinct, current.finances.cash);
        if (!nextCheck.allowed) return current;
        const fee = infrastructureCostForWeek(nextCheck.cost, current.week);
        return {
          ...current,
          stadium: normalizeClubStadium({
            ...current.stadium,
            precinct: buyPrecinctExpansion(currentPrecinct),
          }),
          finances: spendClubCash(current.finances, fee, current.week),
        };
      },
      { infrastructure: true },
    );
  }, [finances.cash, requestClubSpend, stadium.precinct, week]);

  const handlePlaceStreet = useCallback(
    (cells: Array<{ x: number; y: number }>) => {
      const precinct = stadium.precinct ?? emptyPrecinct();
      const preview = placeStreetRun(precinct, cells, finances.cash);
      if (preview.spent <= 0) return;
      const quoted = infrastructureCostForWeek(preview.spent, week);
      requestClubSpend(
        quoted,
        t("spend.street"),
        (current) => {
          const currentPrecinct = current.stadium.precinct ?? emptyPrecinct();
          const result = placeStreetRun(currentPrecinct, cells, current.finances.cash);
          if (result.spent <= 0) return current;
          const fee = infrastructureCostForWeek(result.spent, current.week);
          return {
            ...current,
            stadium: normalizeClubStadium({
              ...current.stadium,
              precinct: result.state,
            }),
            finances: spendClubCash(current.finances, fee, current.week),
          };
        },
        { infrastructure: true },
      );
    },
    [finances.cash, requestClubSpend, stadium.precinct, week],
  );

  const handleExpandPrecinct = useCallback(
    (patchId: string, edge: PrecinctEdge, delta: 1 | -1 = 1) => {
      patchSession((current) => {
        const precinct = current.stadium.precinct ?? emptyPrecinct();
        const check = canNudgePrecinctPatch(precinct, patchId, edge, current.finances.cash, delta);
        if (!check.allowed) return current;
        const nextPrecinct = nudgePrecinctPatch(precinct, patchId, edge, delta);
        if (nextPrecinct === precinct) return current;
        return {
          ...current,
          stadium: normalizeClubStadium({ ...current.stadium, precinct: nextPrecinct }),
        };
      });
    },
    [patchSession],
  );

  const handleRemovePrecinctPatch = useCallback(
    (patchId: string) => {
      patchSession((current) => {
        const precinct = current.stadium.precinct ?? emptyPrecinct();
        const result = removePrecinctPatch(precinct, patchId);
        if (result.refund <= 0 && result.state === precinct) return current;
        const credit = infrastructureCostForWeek(result.refund, current.week);
        return {
          ...current,
          stadium: normalizeClubStadium({ ...current.stadium, precinct: result.state }),
          finances: creditClubCash(current.finances, credit, current.week),
        };
      });
    },
    [patchSession],
  );

  const handleRemoveStreet = useCallback(
    (x: number, y: number) => {
      patchSession((current) => {
        const precinct = current.stadium.precinct ?? emptyPrecinct();
        const result = removeStreetCell(precinct, x, y);
        if (result.refund <= 0) return current;
        const credit = infrastructureCostForWeek(result.refund, current.week);
        return {
          ...current,
          stadium: normalizeClubStadium({ ...current.stadium, precinct: result.state }),
          finances: creditClubCash(current.finances, credit, current.week),
        };
      });
    },
    [patchSession],
  );

  const handleShrinkPrecinctToMin = useCallback(
    (patchId: string) => {
      patchSession((current) => {
        const precinct = current.stadium.precinct ?? emptyPrecinct();
        const nextPrecinct = shrinkPrecinctPatchToMin(precinct, patchId);
        if (nextPrecinct === precinct) return current;
        return {
          ...current,
          stadium: normalizeClubStadium({ ...current.stadium, precinct: nextPrecinct }),
        };
      });
    },
    [patchSession],
  );

  return {
    handleDrawBankLoan,
    handlePurchaseStadiumUpgrade,
    handleStartBlockExpansion,
    handlePlacePrecinct,
    handleUpgradeAcademy,
    handleUpgradePrecinct,
    handleBuyParcel,
    handlePlaceStreet,
    handleExpandPrecinct,
    handleRemovePrecinctPatch,
    handleRemoveStreet,
    handleShrinkPrecinctToMin,
  };
}

export type StadiumActionHandlers = ReturnType<typeof useStadiumActions>;
