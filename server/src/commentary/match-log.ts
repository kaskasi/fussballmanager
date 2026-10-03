import type { MatchEvent, Squad } from "@fussballmanager/shared";
import { createBroadcastDirector } from "./director.ts";
import { commentaryContextFromSquads } from "./render.ts";

export type MatchLogInput = {
  home: Squad;
  away: Squad;
  seed: number;
  events: readonly MatchEvent[];
  finalScore: { home: number; away: number };
};

export function formatMatchLog(input: MatchLogInput): string {
  const ctx = commentaryContextFromSquads(input.home, input.away);
  const director = createBroadcastDirector({
    seed: input.seed,
    homeTeamId: input.home.team.id,
  });
  const homeId = input.home.team.id;
  let home = 0;
  let away = 0;
  const lines: string[] = [
    `${input.home.team.name} vs ${input.away.team.name}`,
    `seed ${input.seed}`,
    "",
  ];

  for (let i = 0; i < input.events.length; i += 1) {
    const event = input.events[i];
    if (!event) {
      continue;
    }
    const emitted = director.emit(event, input.events[i - 1], ctx);
    for (const entry of emitted) {
      let line = entry.text;
      if (entry.voice === "pbp" && event.type === "goal") {
        if (event.scorer.teamId === homeId) {
          home += 1;
        } else {
          away += 1;
        }
        line += `  (${home}–${away})`;
      }
      lines.push(line);
    }
    if (event.type === "period_end" && event.period === "first_half") {
      lines.push(
        `HT ${input.home.team.name} ${home}–${away} ${input.away.team.name}`,
      );
      lines.push("");
    }
  }

  lines.push("");
  lines.push(
    `FT ${input.home.team.name} ${input.finalScore.home}–${input.finalScore.away} ${input.away.team.name}`,
  );
  lines.push(`${input.events.length} events`);
  return lines.join("\n");
}

export function parseSeed(argv: readonly string[], fallback = 2026): number {
  const raw = argv.find(
    (arg, index) => index >= 2 && !arg.startsWith("--") && arg !== "",
  );
  if (raw === undefined) {
    return fallback;
  }
  const seed = Number.parseInt(raw, 10);
  return Number.isFinite(seed) ? seed : fallback;
}
