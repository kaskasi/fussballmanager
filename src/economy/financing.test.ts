import { describe, expect, it } from "vitest";
import { defaultClubFinances } from "./club-finances.ts";
import {
  ABS_MAX_BANK_PRINCIPAL,
  defaultFinancingState,
  drawBankLoan,
  evaluateBankLoan,
  MIN_BANK_LOAN,
} from "./financing.ts";

describe("bank loan eligibility", () => {
  it("allows a loan when serviceability is sufficient", () => {
    const result = evaluateBankLoan({
      finances: defaultClubFinances(),
      wageBillWeekly: 50_000,
      runwayWeeks: 8,
      leaguePlace: 10,
      leagueSize: 18,
      boardPressure: 40,
      divisionId: "regionalliga-nord",
      financing: defaultFinancingState(),
      season: 1,
      week: 10,
    });
    expect(result.allowed).toBe(true);
    expect(result.max_principal).toBeGreaterThanOrEqual(MIN_BANK_LOAN);
    expect(result.max_principal).toBeLessThanOrEqual(ABS_MAX_BANK_PRINCIPAL);
  });

  it("never offers more than the absolute infrastructure cap", () => {
    const result = evaluateBankLoan({
      finances: defaultClubFinances(),
      wageBillWeekly: 20_000,
      runwayWeeks: 20,
      leaguePlace: 1,
      leagueSize: 18,
      boardPressure: 10,
      divisionId: "regionalliga-nord",
      financing: defaultFinancingState(),
      season: 5,
      week: 10,
    });
    expect(result.max_principal).toBeLessThanOrEqual(ABS_MAX_BANK_PRINCIPAL);
  });

  it("rejects when an active bank loan exists", () => {
    const financing = {
      ...defaultFinancingState(),
      active_bank_loan: {
        principal: 200_000,
        remaining: 200_000,
        apr_weekly: 0.001,
        weekly_payment: 4_000,
        drawn_season: 1,
        drawn_week: 1,
      },
    };
    const result = evaluateBankLoan({
      finances: defaultClubFinances(),
      wageBillWeekly: 50_000,
      runwayWeeks: 8,
      leaguePlace: 10,
      leagueSize: 18,
      boardPressure: 40,
      divisionId: "regionalliga-nord",
      financing,
      season: 1,
      week: 10,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Aktives/);
  });

  it("draw increases cash and stores loan", () => {
    const eligibility = evaluateBankLoan({
      finances: defaultClubFinances(),
      wageBillWeekly: 50_000,
      runwayWeeks: 8,
      leaguePlace: 10,
      leagueSize: 18,
      boardPressure: 40,
      divisionId: "regionalliga-nord",
      financing: defaultFinancingState(),
      season: 1,
      week: 10,
    });
    const amount = MIN_BANK_LOAN;
    const drawn = drawBankLoan(
      defaultClubFinances(),
      defaultFinancingState(),
      amount,
      eligibility,
      1,
      10,
    );
    expect(drawn).not.toBeNull();
    expect(drawn!.finances.cash).toBe(defaultClubFinances().cash + amount);
    expect(drawn!.financing.active_bank_loan?.principal).toBe(amount);
  });
});
