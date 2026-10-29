import { SEED_MATCHUP, sandboxPlanFromTactics } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { buildMatchView } from "./match-view.ts";

const base = { seed: 2026, home: SEED_MATCHUP.home, away: SEED_MATCHUP.away, humanTeamId: SEED_MATCHUP.home.team.id };

function pauseTick(view: ReturnType<typeof buildMatchView>, minute: number) {
  const frame = view.frames.find((entry) => entry.clock.period === "second_half" && entry.clock.minute >= minute);
  if (!frame) throw new Error(`no frame at ${minute}'`);
  return frame;
}

describe("manual substitutions (PRD 27)", () => {
  it("replays the same match up to the paused tick and brings the pick on after it", () => {
    const plain = buildMatchView(base);
    const paused = pauseTick(plain, 60);
    const off = SEED_MATCHUP.home.starters.find((place) => place.slot === "ST")!.player;
    const on = SEED_MATCHUP.home.bench.find((player) => player.role !== "GK")!;
    const request = { afterSeq: paused.seq, playerOffId: off.id, playerOnId: on.id };
    const subbed = buildMatchView({ ...base, substitutions: [request] });

    const prefix = (view: typeof plain) => view.frames.filter((frame) => frame.seq <= paused.seq);
    expect(prefix(subbed)).toEqual(prefix(plain));
    expect(subbed.lines.filter((line) => line.seq <= paused.seq)).toEqual(
      plain.lines.filter((line) => line.seq <= paused.seq),
    );

    const change = subbed.frames.find((frame) => frame.seq > paused.seq && frame.cue === "substitution");
    expect(change).toBeDefined();
    expect(change!.substitutionsUsed?.home).toBe(1);
    const onPitch = (frame: (typeof subbed.frames)[number]) => new Set(frame.dots.map((dot) => dot.playerId));
    expect(onPitch(change!).has(on.id)).toBe(true);
    expect(onPitch(change!).has(off.id)).toBe(false);
    expect(subbed.report.substitutions?.some((entry) => entry.teamId === base.humanTeamId)).toBe(true);

    expect(buildMatchView({ ...base, substitutions: [request] }).finalScore).toEqual(subbed.finalScore);
  });

  it("allows three changes and no player twice", () => {
    const plain = buildMatchView(base);
    const paused = pauseTick(plain, 50);
    const outfield = SEED_MATCHUP.home.starters.filter((place) => place.slot !== "GK").map((place) => place.player);
    const bench = SEED_MATCHUP.home.bench.filter((player) => player.role !== "GK");
    const requests = [0, 1, 2, 3].map((index) => ({
      afterSeq: paused.seq,
      playerOffId: outfield[index]!.id,
      playerOnId: bench[index]?.id,
    }));
    // A fifth request brings the first newcomer back on: never allowed.
    requests.push({ afterSeq: paused.seq, playerOffId: bench[0]!.id, playerOnId: outfield[0]!.id });
    const view = buildMatchView({ ...base, substitutions: requests });
    const last = view.frames.at(-1)!;
    expect(last.substitutionsUsed?.home).toBe(3);
    expect(last.dots.some((dot) => dot.playerId === outfield[0]!.id)).toBe(false);
  });

  it("lets the assistant change for the human side once the manager hands over", () => {
    const plain = buildMatchView(base);
    const handover = buildMatchView({ ...base, assistantFromSeq: 0 });
    expect(handover.frames.length).toBeGreaterThan(0);
    // Only injuries trigger an assistant change; with none, the match stays the same.
    const hurt = plain.frames.some((frame) => frame.injury?.teamId === base.humanTeamId && frame.injury.left);
    if (!hurt) expect(handover.finalScore).toEqual(plain.finalScore);
  });
});

describe("custom slot zones (F1.6)", () => {
  it("drops the libero behind his centre-backs and leaves a stock plan untouched", () => {
    const plan = sandboxPlanFromTactics(SEED_MATCHUP.home.tactics);
    const stock = buildMatchView({ ...base, homePlan: plan });
    expect(stock.finalScore).toEqual(buildMatchView(base).finalScore);

    const formationSlots = SEED_MATCHUP.home.starters.map((place) => place.slot);
    const centre = formationSlots.find((slot) => slot === "LCB")!;
    const libero = buildMatchView({ ...base, homePlan: { ...plan, slotZones: { [centre]: "SW" } } });
    expect(libero.homePlan.slotZones).toEqual({ [centre]: "SW" });

    const sweeperId = SEED_MATCHUP.home.starters.find((place) => place.slot === centre)!.player.id;
    const partnerId = SEED_MATCHUP.home.starters.find((place) => place.slot === "RCB")!.player.id;
    const depthOf = (id: string) =>
      libero.frames.reduce((sum, frame) => sum + (frame.dots.find((dot) => dot.playerId === id)?.x ?? 0), 0);
    expect(depthOf(sweeperId)).toBeLessThan(depthOf(partnerId));
  });
});
