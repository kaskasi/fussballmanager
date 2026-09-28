import {
  asPlayerId,
  asTeamId,
  createRng,
  DEFAULT_LINE_CONTROL,
  POSSESSION_LINE_DUTIES,
  SEED_MATCHUP,
  type PlayerMatchStatus,
  type TeamTactics,
} from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { createInitialState } from "./initial-state.ts";
import { pickPassTarget, passTargetWeight, playersBypassed, rolePassLink, throughLeadSpot } from "./pass-graph.ts";
import { occupyBoxTarget } from "./shape.ts";
import { distance } from "./helpers.ts";

const tactics: TeamTactics = {
  teamId: asTeamId("home"),
  formation: "4-3-3",
  mentality: 55,
  pressing: 50,
  width: 62,
  tempo: 50,
  marking: "zonal",
  ...DEFAULT_LINE_CONTROL,
  ...POSSESSION_LINE_DUTIES,
};

const attrs = {
  passing: 60,
  tackling: 50,
  shooting: 50,
  pace: 50,
  stamina: 50,
  positioning: 50,
  aerial: 50,
  dribbling: 50,
  goalkeeping: 8,
  heightCm: 180,
};

function stub(
  role: PlayerMatchStatus["role"],
  slot: PlayerMatchStatus["slot"],
  position: { x: number; y: number },
): PlayerMatchStatus {
  return {
    playerId: asPlayerId(`${role}-${slot}`),
    teamId: asTeamId("home"),
    role,
    slot,
    position,
    onPitch: true,
    attributes: attrs,
    fatigue: 0,
    form: 50,
    yellowCards: 0,
    sentOff: false,
  };
}

describe("pass graph", () => {
  it("recycles from a centre-back to the keeper more than to the striker", () => {
    expect(rolePassLink("CB", "GK")).toBeGreaterThan(rolePassLink("CB", "ST"));
    expect(rolePassLink("ST", "CB")).toBeLessThan(rolePassLink("ST", "W"));
  });

  it("penalizes GK-CB recycling in the defensive third", () => {
    const gk = stub("GK", "GK", { x: 10, y: 50 });
    const cb = stub("CB", "RCB", { x: 14, y: 52 });
    const ownGoal = { x: 0, y: 50 };
    const fresh = passTargetWeight({
      passer: cb,
      target: gk,
      ownGoal,
      attackSign: 1,
      kind: "short",
      offside: false,
      tactics,
    });
    const recycle = passTargetWeight({
      passer: cb,
      target: gk,
      ownGoal,
      attackSign: 1,
      kind: "short",
      offside: false,
      tactics,
      lastPasserId: gk.playerId,
    });
    expect(recycle).toBeLessThan(fresh * 0.2);
  });

  it("treats a GK short ball to a CB as a restart, not a 50/50", () => {
    const gk = stub("GK", "GK", { x: 6, y: 50 });
    const cb = stub("CB", "RCB", { x: 18, y: 62 });
    const st = stub("ST", "ST", { x: 70, y: 50 });
    const ownGoal = { x: 0, y: 50 };
    const toCb = passTargetWeight({
      passer: gk,
      target: cb,
      ownGoal,
      attackSign: 1,
      kind: "restart",
      offside: false,
      tactics,
    });
    const toSt = passTargetWeight({
      passer: gk,
      target: st,
      ownGoal,
      attackSign: 1,
      kind: "restart",
      offside: false,
      tactics,
    });
    expect(toCb).toBeGreaterThan(toSt);
  });

  it("prefers a free nearby teammate over a 40 m ball into a marked full-back", () => {
    const cm = stub("CM", "LCM", { x: 48, y: 22 });
    const st = stub("ST", "ST", { x: 58, y: 28 });
    const fb = stub("FB", "RB", { x: 72, y: 78 });
    const marker = {
      ...stub("CM", "RCM", { x: 71, y: 76 }),
      teamId: asTeamId("away"),
      playerId: asPlayerId("mark"),
    };
    const cover = {
      ...stub("CB", "RCB", { x: 60, y: 50 }),
      teamId: asTeamId("away"),
      playerId: asPlayerId("lane"),
    };
    const ownGoal = { x: 0, y: 50 };
    const toSt = passTargetWeight({
      passer: cm,
      target: st,
      ownGoal,
      attackSign: 1,
      kind: undefined,
      offside: false,
      tactics,
      defenders: [marker, cover],
    });
    const toFb = passTargetWeight({
      passer: cm,
      target: fb,
      ownGoal,
      attackSign: 1,
      kind: undefined,
      offside: false,
      tactics,
      defenders: [marker, cover],
    });
    expect(toSt).toBeGreaterThan(toFb * 2);
  });

  it("never lotteries a 40 m ball into traffic when a free nearby striker exists", () => {
    const kickoff = createInitialState({
      home: SEED_MATCHUP.home,
      away: SEED_MATCHUP.away,
      seed: 7,
    });
    const home = kickoff.homeTeamId;
    const away = kickoff.awayTeamId;
    const cm = { ...stub("CM", "LCM", { x: 62, y: 78 }), teamId: home };
    const st = { ...stub("ST", "ST", { x: 68, y: 58 }), teamId: home };
    const am = { ...stub("CM", "RCM", { x: 64, y: 62 }), teamId: home };
    const gk = { ...stub("GK", "GK", { x: 8, y: 50 }), teamId: home };
    const fb = { ...stub("FB", "RB", { x: 70, y: 22 }), teamId: home };
    const marker = {
      ...stub("CM", "RCM", { x: 69, y: 24 }),
      teamId: away,
      playerId: asPlayerId("mark"),
    };
    const cover = {
      ...stub("CB", "RCB", { x: 66, y: 50 }),
      teamId: away,
      playerId: asPlayerId("lane"),
    };
    const extra = {
      ...stub("ST", "ST", { x: 40, y: 40 }),
      teamId: away,
      playerId: asPlayerId("away-st"),
    };
    const state = {
      ...kickoff,
      possessionTeamId: home,
      ballCarrierId: cm.playerId,
      ball: cm.position,
      players: [cm, st, am, gk, fb, marker, cover, extra],
      rng: createRng(7),
    };
    const ids = new Set<string>();
    let rng = state.rng;
    for (let i = 0; i < 80; i += 1) {
      const picked = pickPassTarget({ ...state, rng }, cm, undefined);
      ids.add(picked.target.playerId);
      rng = picked.rng;
    }
    expect(ids.has(fb.playerId)).toBe(false);
    expect([...ids].some((id) => id === st.playerId || id === am.playerId)).toBe(
      true,
    );
  });

  it("plays a runner into space instead of a safe drop or a blocked feet pass", () => {
    const nine = stub("ST", "ST", { x: 76, y: 50 });
    const ten = {
      ...stub("W", "RW", { x: 77, y: 78 }),
      attributes: { ...attrs, pace: 82 },
    };
    const eleven = stub("W", "LW", { x: 70, y: 18 });
    const eight = stub("CM", "LCM", { x: 50, y: 48 });
    const ownGoal = { x: 0, y: 50 };
    const markEleven = {
      ...stub("CB", "LCB", { x: 72, y: 28 }),
      teamId: asTeamId("away"),
      playerId: asPlayerId("mark-11"),
    };
    const markTen = {
      ...stub("CB", "RCB", { x: 74, y: 80 }),
      teamId: asTeamId("away"),
      playerId: asPlayerId("mark-10"),
    };
    const lastLine = {
      ...stub("FB", "RB", { x: 81, y: 28 }),
      teamId: asTeamId("away"),
      playerId: asPlayerId("last"),
    };
    const presser = {
      ...stub("CM", "RCM", { x: 72, y: 52 }),
      teamId: asTeamId("away"),
      playerId: asPlayerId("press"),
    };
    const lead = throughLeadSpot({
      passer: nine,
      runner: ten,
      ownGoal,
      attackSign: 1,
      defenders: [markEleven, markTen, presser, lastLine],
      homeTeamId: asTeamId("home"),
    });
    expect(lead).not.toBeNull();
    expect(lead && lead.spot.x).toBeGreaterThan(ten.position.x);
    expect(lead && distance(lead.spot, ten.position)).toBeGreaterThan(5);

    const kickoff = createInitialState({
      home: SEED_MATCHUP.home,
      away: SEED_MATCHUP.away,
      seed: 9,
    });
    const home = kickoff.homeTeamId;
    const away = kickoff.awayTeamId;
    const gk = { ...stub("GK", "GK", { x: 8, y: 50 }), teamId: home };
    const players = [
      { ...nine, teamId: home },
      { ...ten, teamId: home },
      { ...eleven, teamId: home },
      { ...eight, teamId: home },
      gk,
      { ...markEleven, teamId: away },
      { ...markTen, teamId: away },
      { ...presser, teamId: away },
      { ...lastLine, teamId: away },
    ];
    const counts = { ten: 0, eight: 0, eleven: 0, through: 0 };
    let rng = createRng(9);
    for (let i = 0; i < 60; i += 1) {
      const picked = pickPassTarget(
        {
          ...kickoff,
          possessionTeamId: home,
          ballCarrierId: nine.playerId,
          ball: nine.position,
          players,
          rng,
        },
        { ...nine, teamId: home },
        undefined,
      );
      rng = picked.rng;
      if (picked.target.playerId === ten.playerId) {
        counts.ten += 1;
      }
      if (picked.target.playerId === eight.playerId) {
        counts.eight += 1;
      }
      if (picked.target.playerId === eleven.playerId) {
        counts.eleven += 1;
      }
      if (picked.kind === "through") {
        counts.through += 1;
      }
    }
    expect(counts.ten).toBeGreaterThan(counts.eight);
    expect(counts.through).toBeGreaterThan(counts.eight);
    expect(counts.ten).toBeGreaterThan(counts.eleven);
  });

  it("refuses a ball into space when the passer is already past the defence", () => {
    const ten = stub("W", "RW", { x: 88, y: 62 });
    const seven = stub("W", "LW", { x: 78, y: 40 });
    const behind = {
      ...stub("CB", "RCB", { x: 70, y: 52 }),
      teamId: asTeamId("away"),
      playerId: asPlayerId("behind"),
    };
    const lead = throughLeadSpot({
      passer: ten,
      runner: seven,
      ownGoal: { x: 0, y: 50 },
      attackSign: 1,
      defenders: [behind],
      homeTeamId: asTeamId("home"),
    });
    expect(lead).toBeNull();
    expect(
      playersBypassed(
        ten.position,
        { x: 84, y: 48 },
        [behind],
        { x: 0, y: 50 },
        1,
      ),
    ).toBe(0);
  });
});

describe("box occupation", () => {
  it("sends the striker into the box when the ball is wide in the final third", () => {
    const st = stub("ST", "ST", { x: 70, y: 50 });
    const ownGoal = { x: 0, y: 50 };
    const box = occupyBoxTarget(st, { x: 82, y: 12 }, ownGoal, 1, tactics);
    expect(box).not.toBeNull();
    expect(box?.x).toBeGreaterThan(78);
    expect(Math.abs((box?.y ?? 0) - 50)).toBeLessThan(15);
  });
});
