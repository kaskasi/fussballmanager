import { describe, expect, it } from "vitest";
import { defaultClubStadium, type ClubStadium } from "../stadium/club-stadium.ts";
import { buildWeeklyFinanceLines } from "./club-finances.ts";
import {
  defaultClubMerchandising,
  fanshopMerchLevel,
  merchInboundQtyBySku,
  merchMaxStockForSku,
  normalizeClubMerchandising,
} from "./merchandising.ts";
import {
  MERCH_EXPERT_CASH_RESERVE,
  MERCH_EXPERT_TARGET_FILL,
  commissionMerchExpertAgency,
  generateMerchExpertCandidates,
  hireMerchExpert,
  merchExpertCandidateSetId,
  merchExpertExpressRebate,
  merchExpertHirePhase,
  merchExpertReorderTrigger,
  merchExpertWageWeekly,
  merchExpertWorkdaysLeft,
  runMerchExpertRestock,
  type MerchExpertCandidate,
  type MerchExpertState,
} from "./merchandising-expert.ts";
import { MERCH_SKU_IDS } from "./merchandising-skus.ts";

const MONDAY = { season: 1, week: 2, weekday: 1 };

function hiredExpert(skill: number): MerchExpertState {
  return {
    hire: "hired",
    expert: { first: "Jonas", last: "Brandt", portrait_seed: 7, skill, wage_weekly: 900 },
  };
}

function stadiumWith(expert: MerchExpertState | undefined, stock = 0): ClubStadium {
  const merch = defaultClubMerchandising();
  for (const sku of MERCH_SKU_IDS) {
    merch.skus[sku] = { ...merch.skus[sku]!, stock };
  }
  return { ...defaultClubStadium(), merchandising: { ...merch, ...(expert ? { expert } : {}) } };
}

function hireFirstEligible(masterSeed: number): MerchExpertState {
  const pending = commissionMerchExpertAgency(undefined, MONDAY);
  const candidate = generateMerchExpertCandidates({
    masterSeed,
    candidateSetId: merchExpertCandidateSetId(MONDAY),
  }).find((entry) => !entry.disqualified)!;
  return hireMerchExpert(pending, candidate);
}

describe("merch expert agency", () => {
  it("opens candidates after five workdays like the camp leader agency", () => {
    const pending = commissionMerchExpertAgency(undefined, MONDAY);
    expect(merchExpertHirePhase(pending, MONDAY)).toBe("agency_pending");
    expect(merchExpertWorkdaysLeft(MONDAY, { ...MONDAY, weekday: 4 })).toBe(2);
    expect(merchExpertHirePhase(pending, { ...MONDAY, weekday: 5 })).toBe("agency_pending");
    expect(merchExpertHirePhase(pending, { season: 1, week: 3, weekday: 1 })).toBe(
      "candidates_ready",
    );
  });

  it("commissioning twice keeps the first request", () => {
    const first = commissionMerchExpertAgency(undefined, MONDAY);
    const second = commissionMerchExpertAgency(first, { ...MONDAY, week: 5 });
    expect(second).toEqual(first);
  });

  it("offers three deterministic candidates, one of whom drops out", () => {
    const input = { masterSeed: 42, candidateSetId: merchExpertCandidateSetId(MONDAY) };
    const candidates = generateMerchExpertCandidates(input);
    expect(candidates).toHaveLength(3);
    expect(generateMerchExpertCandidates(input)).toEqual(candidates);
    expect(candidates.filter((entry) => entry.disqualified)).toHaveLength(1);
    const eligible = candidates.filter((entry) => !entry.disqualified);
    const [better, worse] = [...eligible].sort((a, b) => b.skill - a.skill);
    expect(better!.wage_weekly).toBeGreaterThan(worse!.wage_weekly);
  });

  it("cannot hire a candidate who dropped out", () => {
    const pending = commissionMerchExpertAgency(undefined, MONDAY);
    const dropout = generateMerchExpertCandidates({
      masterSeed: 42,
      candidateSetId: merchExpertCandidateSetId(MONDAY),
    }).find((entry): entry is MerchExpertCandidate => entry.disqualified)!;
    expect(hireMerchExpert(pending, dropout)).toEqual(pending);
  });

  it("charges the wage only once hired", () => {
    expect(merchExpertWageWeekly({ expert: commissionMerchExpertAgency(undefined, MONDAY) })).toBe(0);
    const hired = hireFirstEligible(42);
    expect(hired.hire).toBe("hired");
    expect(merchExpertWageWeekly({ expert: hired })).toBe(hired.expert!.wage_weekly);
  });
});

describe("merch expert restock", () => {
  const level = fanshopMerchLevel(defaultClubStadium().precinct);

  it("does nothing without a hired expert", () => {
    const stadium = stadiumWith(undefined);
    const result = runMerchExpertRestock(stadium, { cash: 5_000_000, season: 1, week: 2 });
    expect(result.lines).toHaveLength(0);
    expect(result.stadium).toBe(stadium);
  });

  it("refills empty SKUs to about 25 % of capacity via Express", () => {
    const stadium = stadiumWith(hiredExpert(100));
    const result = runMerchExpertRestock(stadium, { cash: 5_000_000, season: 1, week: 2 });
    expect(result.lines.length).toBe(MERCH_SKU_IDS.length);
    const inbound = merchInboundQtyBySku(normalizeClubMerchandising(result.stadium.merchandising));
    for (const sku of MERCH_SKU_IDS) {
      const target = Math.round(merchMaxStockForSku(level, sku) * MERCH_EXPERT_TARGET_FILL);
      expect(inbound[sku]).toBe(target);
    }
    expect(result.cost).toBe(result.lines.reduce((sum, line) => sum + line.cost, 0));
    expect(result.cost).toBeGreaterThan(0);
  });

  it("counts inbound units and orders nothing twice", () => {
    const stadium = stadiumWith(hiredExpert(100));
    const first = runMerchExpertRestock(stadium, { cash: 5_000_000, season: 1, week: 2 });
    const second = runMerchExpertRestock(first.stadium, { cash: 5_000_000, season: 1, week: 2 });
    expect(second.lines).toHaveLength(0);
  });

  it("leaves SKUs above the reorder line alone", () => {
    const max = merchMaxStockForSku(level, "trikots");
    const stadium = stadiumWith(hiredExpert(100), max);
    const result = runMerchExpertRestock(stadium, { cash: 5_000_000, season: 1, week: 2 });
    expect(result.lines).toHaveLength(0);
  });

  it("a weak expert waits longer than a sharp one", () => {
    expect(merchExpertReorderTrigger(100)).toBeCloseTo(MERCH_EXPERT_TARGET_FILL);
    expect(merchExpertReorderTrigger(30)).toBeLessThan(merchExpertReorderTrigger(90));
    const max = merchMaxStockForSku(level, "trikots");
    const justBelowBase = Math.floor(max * MERCH_EXPERT_TARGET_FILL * 0.9);
    const sharp = runMerchExpertRestock(stadiumWith(hiredExpert(100), justBelowBase), {
      cash: 5_000_000,
      season: 1,
      week: 2,
    });
    const weak = runMerchExpertRestock(stadiumWith(hiredExpert(10), justBelowBase), {
      cash: 5_000_000,
      season: 1,
      week: 2,
    });
    expect(sharp.lines.some((line) => line.sku === "trikots")).toBe(true);
    expect(weak.lines.some((line) => line.sku === "trikots")).toBe(false);
  });

  it("a higher skill pays less for the same Express order", () => {
    expect(merchExpertExpressRebate(100)).toBeGreaterThan(merchExpertExpressRebate(20));
    const sharp = runMerchExpertRestock(stadiumWith(hiredExpert(100)), {
      cash: 5_000_000,
      season: 1,
      week: 2,
    });
    const weak = runMerchExpertRestock(stadiumWith(hiredExpert(0)), {
      cash: 5_000_000,
      season: 1,
      week: 2,
    });
    expect(sharp.cost).toBeLessThan(weak.cost);
  });

  it("never spends below the cash reserve", () => {
    const stadium = stadiumWith(hiredExpert(100));
    const broke = runMerchExpertRestock(stadium, {
      cash: MERCH_EXPERT_CASH_RESERVE,
      season: 1,
      week: 2,
    });
    expect(broke.lines).toHaveLength(0);
    const rich = runMerchExpertRestock(stadium, { cash: 5_000_000, season: 1, week: 2 });
    const limited = runMerchExpertRestock(stadium, {
      cash: MERCH_EXPERT_CASH_RESERVE + rich.lines[0]!.cost,
      season: 1,
      week: 2,
    });
    expect(limited.lines.length).toBeLessThan(rich.lines.length);
    expect(limited.cost).toBeLessThanOrEqual(rich.lines[0]!.cost);
  });
});

describe("merch expert finances", () => {
  it("books the wage into staff wages and the restock as a merchandising expense", () => {
    const base = {
      players: [],
      clubId: "cl_fc_nordstern",
      divisionId: "regionalliga-nord",
      isHomeMatchWeek: false,
      season: 1,
      week: 2,
      merchandisingNet: 0,
    } as const;
    const without = buildWeeklyFinanceLines(base);
    const withExpert = buildWeeklyFinanceLines({
      ...base,
      merchExpertWagesWeekly: 900,
      merchRestockCost: 1_500,
    });
    const staff = (lines: typeof without) => lines.find((line) => line.kind === "staff_wages")!.amount;
    expect(staff(withExpert) - staff(without)).toBe(-900);
    expect(withExpert.find((line) => line.kind === "merchandising")?.amount).toBe(-1_500);
  });
});
