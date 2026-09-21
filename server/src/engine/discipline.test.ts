import { SEED_MATCHUP } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { duelFoulChance, stepCard, stepFoul, stepInjury } from "./discipline.ts";
import { createInitialState } from "./initial-state.ts";
import { onPitchFor } from "./helpers.ts";
import { step } from "./step.ts";

function afterKickoff() {
  const initial = createInitialState({
    home: SEED_MATCHUP.home,
    away: SEED_MATCHUP.away,
    seed: 4,
  });
  return step({
    state: initial,
    homeTactics: initial.homeTactics,
    awayTactics: initial.awayTactics,
  }).state;
}

describe("discipline", () => {
  it("keeps a typical tackle from being a yellow-card lottery", () => {
    expect(
      duelFoulChance({ pressing: 50, fatigue: 20, kindTackle: true }),
    ).toBeLessThan(0.08);
    expect(
      duelFoulChance({ pressing: 80, fatigue: 40, kindTackle: true }),
    ).toBeLessThan(0.09);
  });

  it("emits a foul and follows up with a card and/or free kick", () => {
    const state = afterKickoff();
    const attacker = onPitchFor(state.players, state.homeTeamId)[0];
    const defender = onPitchFor(state.players, state.awayTeamId)[0];
    expect(attacker && defender).toBeTruthy();
    if (!attacker || !defender) {
      return;
    }
    const fouled = stepFoul(state, defender, attacker);
    expect(fouled.event.type).toBe("foul");
    expect(fouled.state.possessionTeamId).toBe(attacker.teamId);
    expect(fouled.state.pending).not.toBeNull();

    const follow = step({
      state: fouled.state,
      homeTactics: fouled.state.homeTactics,
      awayTactics: fouled.state.awayTactics,
    });
    expect(["card", "restart"]).toContain(follow.event.type);
    if (follow.event.type === "restart") {
      expect(follow.event.phase).toBe("free_kick");
    }
  });

  it("turns a foul in the box into a penalty", () => {
    const state = afterKickoff();
    const attacker = onPitchFor(state.players, state.homeTeamId).find(
      (player) => player.role === "ST",
    );
    const defender = onPitchFor(state.players, state.awayTeamId).find(
      (player) => player.role === "CB",
    );
    expect(attacker && defender).toBeTruthy();
    if (!attacker || !defender) {
      return;
    }
    const boxed = {
      ...state,
      players: state.players.map((player) =>
        player.playerId === attacker.playerId
          ? { ...player, position: { x: 90, y: 50 } }
          : player,
      ),
    };
    const fouledPlayer =
      boxed.players.find((player) => player.playerId === attacker.playerId) ??
      attacker;
    const fouled = stepFoul(boxed, defender, fouledPlayer);
    const pending = fouled.state.pending;
    expect(pending).toBeTruthy();
    if (pending?.type === "restart") {
      expect(pending.phase).toBe("penalty");
    }
    if (pending?.type === "card") {
      expect(pending.thenRestart?.phase).toBe("penalty");
    }
    let current = fouled.state;
    let sawPenalty = false;
    let sawShot = false;
    for (let i = 0; i < 6; i += 1) {
      const next = step({
        state: current,
        homeTactics: current.homeTactics,
        awayTactics: current.awayTactics,
      });
      if (next.event.type === "restart" && next.event.phase === "penalty") {
        sawPenalty = true;
      }
      if (next.event.type === "shot") {
        sawShot = true;
        break;
      }
      current = next.state;
    }
    expect(sawPenalty).toBe(true);
    expect(sawShot).toBe(true);
  });

  it("sends a player off on a second yellow", () => {
    const state = afterKickoff();
    const defender = onPitchFor(state.players, state.awayTeamId).find(
      (player) => player.role !== "GK",
    );
    expect(defender).toBeDefined();
    if (!defender) {
      return;
    }
    const carded = stepCard(state, defender.playerId, "second_yellow", undefined);
    expect(carded.event.type).toBe("card");
    const live = carded.state.players.find(
      (player) => player.playerId === defender.playerId,
    );
    expect(live?.sentOff).toBe(true);
    expect(live?.onPitch).toBe(false);
    expect(onPitchFor(carded.state.players, defender.teamId)).toHaveLength(10);
  });

  it("can substitute an injured player who leaves the pitch", () => {
    const state = afterKickoff();
    const victim = onPitchFor(state.players, state.homeTeamId).find(
      (player) => player.role === "CM",
    );
    expect(victim).toBeDefined();
    if (!victim) {
      return;
    }
    let current = state;
    let injury = stepInjury(current, victim.playerId);
    for (
      let i = 0;
      i < 40 &&
      injury.event.type === "injury" &&
      injury.event.severity === "knock";
      i += 1
    ) {
      current = { ...state, rng: injury.state.rng };
      injury = stepInjury(current, victim.playerId);
    }
    expect(injury.event.type).toBe("injury");
    if (injury.event.type !== "injury") {
      return;
    }
    expect(injury.event.severity).not.toBe("knock");
    expect(injury.state.pending?.type).toBe("substitution");
    const sub = step({
      state: injury.state,
      homeTactics: injury.state.homeTactics,
      awayTactics: injury.state.awayTactics,
    });
    expect(sub.event.type).toBe("substitution");
    if (sub.event.type === "substitution") {
      expect(sub.event.playerOff.playerId).toBe(victim.playerId);
      expect(sub.event.playerOn.playerId).not.toBe(victim.playerId);
    }
    expect(sub.state.substitutionsUsed.home).toBe(1);
  });

  it("does not auto-sub the human-managed team after an injury", () => {
    const state = {
      ...afterKickoff(),
      humanTeamId: SEED_MATCHUP.home.team.id,
    };
    const victim = onPitchFor(state.players, state.homeTeamId).find(
      (player) => player.role === "CM",
    );
    expect(victim).toBeDefined();
    if (!victim) {
      return;
    }
    let current = state;
    let injury = stepInjury(current, victim.playerId);
    for (
      let i = 0;
      i < 40 &&
      injury.event.type === "injury" &&
      injury.event.severity === "knock";
      i += 1
    ) {
      current = { ...state, rng: injury.state.rng };
      injury = stepInjury(current, victim.playerId);
    }
    expect(injury.event.type).toBe("injury");
    if (injury.event.type !== "injury") {
      return;
    }
    expect(injury.event.severity).not.toBe("knock");
    expect(injury.state.pending).toBeNull();
    const live = injury.state.players.find(
      (player) => player.playerId === victim.playerId,
    );
    expect(live?.onPitch).toBe(false);
    expect(onPitchFor(injury.state.players, state.homeTeamId)).toHaveLength(10);
  });

  it("still auto-subs an AI opponent when the human team is set", () => {
    const state = {
      ...afterKickoff(),
      humanTeamId: SEED_MATCHUP.home.team.id,
    };
    const victim = onPitchFor(state.players, state.awayTeamId).find(
      (player) => player.role === "CM",
    );
    expect(victim).toBeDefined();
    if (!victim) {
      return;
    }
    let current = state;
    let injury = stepInjury(current, victim.playerId);
    for (
      let i = 0;
      i < 40 &&
      injury.event.type === "injury" &&
      injury.event.severity === "knock";
      i += 1
    ) {
      current = { ...state, rng: injury.state.rng };
      injury = stepInjury(current, victim.playerId);
    }
    expect(injury.state.pending?.type).toBe("substitution");
    const sub = step({
      state: injury.state,
      homeTactics: injury.state.homeTactics,
      awayTactics: injury.state.awayTactics,
    });
    expect(sub.event.type).toBe("substitution");
    expect(sub.state.substitutionsUsed.away).toBe(1);
  });
});
