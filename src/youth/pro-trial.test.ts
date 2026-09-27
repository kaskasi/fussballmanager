import { describe, expect, it } from "vitest";
import { ACHIEVEMENT } from "../player/achievements.ts";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { MAX_PRO_SQUAD_SIZE } from "./promotion-gate.ts";
import {
  advanceProTrials,
  isOnProTrial,
  PRO_TRIAL_WEEKS,
  startProTrial,
} from "./pro-trial.ts";

const CLUB = "cl_fc_nordstern";

describe("pro trial", () => {
  it("starts a one-week pro training trial for U19 players", () => {
    const player = clonePlayer();
    player.squad_status = "u19";
    const next = startProTrial(player, 1, 10);
    expect(next.squad_status).toBe("u19");
    expect(next.state.pro_trial).toEqual({
      season: 1,
      started_week: 10,
      ends_week: 10 + PRO_TRIAL_WEEKS,
    });
    expect(next.history.achievements).toContain(ACHIEVEMENT.proTrialWeek);
  });

  it("promotes to pro when the trial ends and the gate allows", () => {
    const youth = clonePlayer();
    youth.id = "youth_1";
    youth.club_id = CLUB;
    youth.squad_status = "u19";
    youth.state.pro_trial = { season: 1, started_week: 10, ends_week: 11 };

    const step = advanceProTrials([youth], CLUB, 1, 11);
    expect(step.promotedIds).toEqual(["youth_1"]);
    expect(step.players[0]?.squad_status).toBe("pro");
    expect(step.players[0]?.state.pro_trial).toBeUndefined();
    expect(step.players[0]?.history.achievements).toContain(ACHIEVEMENT.promotedPro);
  });

  it("fails the trial when the pro squad is full at week end", () => {
    const pros = Array.from({ length: MAX_PRO_SQUAD_SIZE }, (_, index) => {
      const player = clonePlayer();
      player.id = `pro_${index}`;
      player.club_id = CLUB;
      player.squad_status = "pro";
      player.position = index % 2 === 0 ? "CB" : "DM";
      return player;
    });
    const youth = clonePlayer();
    youth.id = "youth_blocked";
    youth.club_id = CLUB;
    youth.squad_status = "u19";
    youth.position = "RB";
    youth.state.morale = 60;
    youth.state.pro_trial = { season: 1, started_week: 10, ends_week: 11 };

    const step = advanceProTrials([...pros, youth], CLUB, 1, 11);
    expect(step.failedIds).toEqual(["youth_blocked"]);
    expect(step.players.find((player) => player.id === "youth_blocked")?.squad_status).toBe("u19");
    expect(step.players.find((player) => player.id === "youth_blocked")?.state.morale).toBeLessThan(60);
  });

  it("flags trial weeks for pro-scale training", () => {
    const player = startProTrial(clonePlayer(), 1, 5);
    expect(isOnProTrial(player, 1, 5)).toBe(true);
    expect(isOnProTrial(player, 1, 6)).toBe(true);
    expect(isOnProTrial(player, 1, 7)).toBe(false);
  });
});
