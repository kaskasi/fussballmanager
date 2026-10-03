import { describe, expect, it } from "vitest";
import { defaultLeagueState } from "../persistence/league-state.ts";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  advanceWeeklyClubFinances,
  applyPlayerSaleIncome,
  applySeasonEndFinances,
  applyTransferFee,
  canAffordTransfer,
  defaultClubFinances,
  formatClubCash,
  matchdayTicketIncome,
  normalizeFinances,
  wageBudgetHeadroom,
  weeklyWageBill,
} from "./club-finances.ts";
import { financeMonthForWeek } from "./finance-ledger.ts";
import { defaultCoachingStaff, weeklyStaffWageBill } from "../staff/coaching-staff.ts";
import { defaultClubStadium } from "../stadium/club-stadium.ts";
import { defaultSponsorOffer, signSponsorDeal } from "../stadium/sponsor-deals.ts";

describe("club finances", () => {
  it("sums weekly wages for owned players", () => {
    const player = clonePlayer();
    player.club_id = "cl_fc_nordstern";
    player.contract = { ...player.contract!, wage_weekly: 1_000 };
    expect(weeklyWageBill([player], "cl_fc_nordstern")).toBe(1_000);
  });

  it("uses coaching staff wages when staff is provided", () => {
    const staff = defaultCoachingStaff(1);
    const { finances } = advanceWeeklyClubFinances(defaultClubFinances(), {
      players: [],
      clubId: "cl_fc_nordstern",
      divisionId: "regionalliga-nord",
      isHomeMatchWeek: false,
      season: 1,
      week: 1,
      coachingStaff: staff,
    });
    expect(finances.cash).toBe(
      defaultClubFinances().cash + 55_000 + 12_000 - weeklyStaffWageBill(staff) - 9_000,
    );
  });

  it("applies sponsorship, tv, wages, staff and maintenance each week", () => {
    const player = clonePlayer();
    player.club_id = "cl_fc_nordstern";
    player.contract = { ...player.contract!, wage_weekly: 5_000 };
    const { finances } = advanceWeeklyClubFinances(defaultClubFinances(), {
      players: [player],
      clubId: "cl_fc_nordstern",
      divisionId: "regionalliga-nord",
      isHomeMatchWeek: false,
      season: 1,
      week: 1,
    });
    expect(finances.cash).toBe(defaultClubFinances().cash + 55_000 + 12_000 - 5_000 - 18_000 - 9_000);
    expect(finances.pending_lines).toHaveLength(5);
  });

  it("adds ticket income on home match weeks", () => {
    const { finances } = advanceWeeklyClubFinances(defaultClubFinances(), {
      players: [],
      clubId: "cl_fc_nordstern",
      divisionId: "regionalliga-nord",
      isHomeMatchWeek: true,
      season: 1,
      week: 2,
    });
    expect(finances.cash).toBe(
      defaultClubFinances().cash +
        55_000 +
        12_000 -
        18_000 -
        9_000 +
        matchdayTicketIncome("regionalliga-nord", true),
    );
  });

  it("credits player sales to cash and transfer pool", () => {
    const finances = defaultClubFinances();
    const afterSale = applyPlayerSaleIncome(finances, 1_000_000, 28);
    expect(afterSale.cash).toBe(finances.cash + 1_000_000);
    expect(afterSale.transfer_budget).toBe(finances.transfer_budget + 500_000);
  });

  it("uses transfer_budget for affordability and fees", () => {
    const finances = normalizeFinances({
      cash: 500_000,
      transfer_budget: 400_000,
      wage_budget_weekly: 85_000,
      last_closed_month: 0,
    });
    expect(canAffordTransfer(finances, 350_000)).toBe(true);
    expect(canAffordTransfer(finances, 450_000)).toBe(false);
    const afterFee = applyTransferFee(finances, 300_000, 8);
    expect(afterFee.cash).toBe(200_000);
    expect(afterFee.transfer_budget).toBe(100_000);
  });

  it("closes finance month after week 4", () => {
    let finances = defaultClubFinances();
    for (let week = 1; week <= 4; week += 1) {
      finances = advanceWeeklyClubFinances(finances, {
        players: [],
        clubId: "cl_fc_nordstern",
        divisionId: "regionalliga-nord",
        isHomeMatchWeek: false,
        season: 1,
        week,
      }).finances;
    }
    expect(financeMonthForWeek(4)).toBe(1);
    expect(finances.last_closed_month).toBe(1);
    expect(finances.ledger).toHaveLength(1);
    expect(finances.pending_lines).toHaveLength(0);
  });

  it("reports wage budget headroom", () => {
    const player = clonePlayer();
    player.club_id = "cl_fc_nordstern";
    player.contract = { ...player.contract!, wage_weekly: 40_000 };
    const finances = defaultClubFinances();
    expect(wageBudgetHeadroom(finances, [player], "cl_fc_nordstern")).toBe(45_000);
  });

  it("pays season prizes into cash and transfer pool", () => {
    const league = defaultLeagueState();
    league.season_complete = true;
    const next = applySeasonEndFinances(defaultClubFinances(), league, 1, 30);
    expect(next.cash).toBeGreaterThan(defaultClubFinances().cash);
    expect(next.transfer_budget).toBeGreaterThan(defaultClubFinances().transfer_budget);
  });

  it("adds board sponsorship to the weekly F6.2 line", () => {
    const offer = defaultSponsorOffer("board_west");
    const stadium = defaultClubStadium();
    stadium.sponsor_deals = signSponsorDeal([], "board_west", 1, offer);
    const { finances } = advanceWeeklyClubFinances(defaultClubFinances(), {
      players: [],
      clubId: "cl_fc_nordstern",
      divisionId: "regionalliga-nord",
      isHomeMatchWeek: false,
      season: 1,
      week: 1,
      stadium,
    });
    expect(finances.cash).toBe(
      defaultClubFinances().cash + 55_000 + offer.weeklyAmount + 12_000 - 18_000 - 9_000,
    );
  });

  it("pays the top-scorer staffel at season end", () => {
    const league = defaultLeagueState();
    league.season_complete = true;
    league.career_player_stats = [
      {
        playerId: "p_test",
        name: "Test",
        goals: 18,
        assists: 0,
        yellowCards: 0,
        minutes: 900,
        apps: 10,
      },
    ];
    const offer = { ...defaultSponsorOffer("shirt"), bonusTopScorer: true };
    const stadium = defaultClubStadium();
    stadium.sponsor_deals = signSponsorDeal([], "shirt", 1, offer);
    const next = applySeasonEndFinances(defaultClubFinances(), league, 1, 30, stadium);
    expect(next.pending_lines?.some((line) => line.kind === "other" && line.amount === 1_000_000)).toBe(
      true,
    );
  });

  it("formats cash for the UI", () => {
    expect(formatClubCash(6_000_000)).toContain("Mio.");
    expect(formatClubCash(12_500)).toContain("k");
  });
});
