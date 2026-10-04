import { describe, expect, it } from "vitest";
import { addCalendarDays } from "../sim/calendar-days.ts";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { validAttributes } from "../types/__tests__/fixtures.ts";
import {
  ACCEPT_WAGE_RATIO,
  CONTRACT_FAIL_COOLDOWN_DAYS,
  CONTRACT_SIGN_COOLDOWN_DAYS,
  contractTalkBounds,
  contractTalkLock,
  defaultContractOffer,
  describeContractOffer,
  evaluateContractOffer,
  playerContractAsk,
  remainingContractYears,
  roleWageModifier,
  submitContractOffer,
  TALK_BLOCK_REASON,
  wageDeltaFitsBudget,
  weeklyWageAnchor,
  type ContractOffer,
} from "./contract-talks.ts";

const DAY_ONE = { season: 1, week: 1, weekday: 1 };

function lowball(player: ReturnType<typeof clonePlayer>): ContractOffer {
  const ask = playerContractAsk(player, 1);
  return {
    wageWeekly: Math.floor(ask.wageWeekly * 0.5),
    termYears: 1,
    bonusAppearance: 0,
    minutesPromise: "rotation",
  };
}

describe("contract talks (PRD 05.4 / F5.4)", () => {
  it("anchors weekly wage at market_value × 0.8% / 52", () => {
    expect(weeklyWageAnchor(3_500_000)).toBe(538);
  });

  it("uses youth wage bands as a floor", () => {
    const player = clonePlayer();
    player.squad_status = "u17";
    player.age = 15;
    player.market_value = 16_000;
    player.contract = null;
    const ask = playerContractAsk(player, 1);
    expect(ask.wageWeekly).toBe(80);
    expect(ask.termYearsMin).toBe(3);
  });

  it("applies rotation −15% and star +30%", () => {
    const rotation = clonePlayer();
    rotation.contract = { ...rotation.contract!, guaranteed_minutes_promise: "rotation" };
    expect(roleWageModifier(rotation)).toBe(0.85);

    const star = clonePlayer();
    star.squad_status = "pro";
    star.attributes = { ...validAttributes };
    for (const key of Object.keys(star.attributes) as (keyof typeof star.attributes)[]) {
      star.attributes[key] = 140;
    }
    expect(roleWageModifier(star)).toBe(1.3);
  });

  it("accepts an offer at the wage floor with enough years and bonus", () => {
    const player = clonePlayer();
    const ask = playerContractAsk(player, 1);
    expect(
      evaluateContractOffer(player, 1, {
        wageWeekly: Math.ceil(ask.wageWeekly * ACCEPT_WAGE_RATIO),
        termYears: ask.termYearsMin,
        bonusAppearance: ask.bonusAppearance,
        minutesPromise: "rotation",
      }),
    ).toBe("accept");
  });

  it("rejects a lowball wage", () => {
    const player = clonePlayer();
    const ask = playerContractAsk(player, 1);
    expect(
      evaluateContractOffer(player, 1, {
        wageWeekly: Math.floor(ask.wageWeekly * 0.8),
        termYears: 5,
        bonusAppearance: ask.bonusAppearance,
        minutesPromise: "rotation",
      }),
    ).toBe("reject");
  });

  it("explains a lowball wage after the first miss", () => {
    const player = clonePlayer();
    const ask = playerContractAsk(player, 1);
    expect(
      describeContractOffer(player, 1, {
        wageWeekly: Math.floor(ask.wageWeekly * 0.8),
        termYears: 5,
        bonusAppearance: ask.bonusAppearance,
        minutesPromise: "rotation",
      }).reason,
    ).toBe("Zu wenig Gehalt.");
  });

  it("rejects a minutes / startplatz downgrade", () => {
    const player = clonePlayer();
    player.contract = { ...player.contract!, guaranteed_minutes_promise: "starter" };
    const ask = playerContractAsk(player, 1, "starter");
    expect(
      evaluateContractOffer(player, 1, {
        wageWeekly: ask.wageWeekly,
        termYears: 5,
        bonusAppearance: ask.bonusAppearance,
        minutesPromise: "rotation",
      }),
    ).toBe("reject");
  });

  it("hits morale and desire_to_leave after three failed offers", () => {
    let player = clonePlayer();
    player.state.morale = 70;
    const offer = lowball(player);
    player = submitContractOffer(player, 1, offer, DAY_ONE).player;
    player = submitContractOffer(
      player,
      1,
      offer,
      addCalendarDays(DAY_ONE, CONTRACT_FAIL_COOLDOWN_DAYS),
    ).player;
    const third = submitContractOffer(
      player,
      1,
      offer,
      addCalendarDays(DAY_ONE, CONTRACT_FAIL_COOLDOWN_DAYS * 2),
    );
    expect(third.accepted).toBe(false);
    expect(third.player.state.contract_failed_offers).toBe(3);
    expect(third.player.state.desire_to_leave).toBe(true);
    expect(third.player.state.morale).toBe(60);
  });

  it("stays open after one failed offer and locks angry after three", () => {
    const player = clonePlayer();
    const first = submitContractOffer(player, 1, lowball(player), DAY_ONE);
    expect(first.accepted).toBe(false);
    expect(contractTalkLock(first.player, addCalendarDays(DAY_ONE, 10)).allowed).toBe(true);

    let next = first.player;
    next = submitContractOffer(next, 1, lowball(next), addCalendarDays(DAY_ONE, 1)).player;
    const third = submitContractOffer(next, 1, lowball(next), addCalendarDays(DAY_ONE, 2));
    const lock = contractTalkLock(third.player, addCalendarDays(DAY_ONE, 2));
    expect(lock.allowed).toBe(false);
    expect(lock.kind).toBe("angry");
    expect(lock.reason).toBe(TALK_BLOCK_REASON.angry);
  });

  it("writes the contract, resets frustration, and locks 60 days", () => {
    const player = clonePlayer();
    player.state.contract_failed_offers = 2;
    player.state.desire_to_leave = true;
    const ask = playerContractAsk(player, 1);
    const result = submitContractOffer(player, 1, {
      wageWeekly: ask.wageWeekly,
      termYears: ask.termYearsMin,
      bonusAppearance: ask.bonusAppearance,
      minutesPromise: "rotation",
    }, DAY_ONE);
    expect(result.accepted).toBe(true);
    expect(result.player.contract?.wage_weekly).toBe(ask.wageWeekly);
    expect(result.player.contract?.until_season).toBe(1 + ask.termYearsMin);
    expect(result.player.state.contract_failed_offers).toBe(0);
    expect(result.player.state.desire_to_leave).toBe(false);
    expect(contractTalkLock(result.player, addCalendarDays(DAY_ONE, 10)).allowed).toBe(false);
    expect(
      contractTalkLock(result.player, addCalendarDays(DAY_ONE, CONTRACT_SIGN_COOLDOWN_DAYS)).allowed,
    ).toBe(true);
    expect(result.message).toContain("Saison 20");
  });

  it("blocks a wage rise that exceeds weekly headroom", () => {
    expect(wageDeltaFitsBudget(100, 800, 950)).toBe(false);
    expect(wageDeltaFitsBudget(100, 800, 900)).toBe(true);
  });

  it("starts sliders at the current deal when one exists", () => {
    const player = clonePlayer();
    expect(remainingContractYears(player, 1)).toBe(2);
    const offer = defaultContractOffer(player, 1);
    expect(offer.wageWeekly).toBe(800);
    expect(offer.termYears).toBe(2);
    expect(offer.bonusAppearance).toBe(100);
    expect(offer.minutesPromise).toBe("rotation");
    const bounds = contractTalkBounds(player, 1);
    expect(bounds.wageMax).toBeGreaterThanOrEqual(800);
    expect(bounds.termMax).toBe(5);
  });

  it("starts youth without a contract at the band floor", () => {
    const player = clonePlayer();
    player.squad_status = "u17";
    player.age = 15;
    player.market_value = 16_000;
    player.contract = null;
    const offer = defaultContractOffer(player, 1);
    expect(offer.wageWeekly).toBe(80);
    expect(offer.termYears).toBe(3);
    expect(offer.minutesPromise).toBe("none");
  });

  it("opens above the current wage after desire_to_leave inflates the ask", () => {
    const player = clonePlayer();
    player.contract = { ...player.contract!, wage_weekly: 170 };
    player.state.desire_to_leave = true;
    const ask = playerContractAsk(player, 1);
    const offer = defaultContractOffer(player, 1);
    expect(ask.wageWeekly).toBeGreaterThan(170);
    expect(offer.wageWeekly).toBe(ask.wageWeekly);
  });
});
