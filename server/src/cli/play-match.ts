import { kickoffLineup, SEED_MATCHUP, type Squad } from "@fussballmanager/shared";

function printSquad(label: string, squad: Squad, side: "home" | "away"): void {
  console.log(`${label} ${squad.team.name} (${squad.tactics.formation})`);
  for (const place of kickoffLineup(squad, side)) {
    console.log(
      `  ${place.slot.padEnd(3)} ${place.player.name}  form ${place.player.form}  fatigue ${place.player.fatigue}`,
    );
  }
  console.log(
    `  Bench: ${squad.bench.map((player) => player.name).join(", ")}`,
  );
  console.log("");
}

console.log("Football Manager — Phase 1");
console.log("Two fictional squads, no match simulated yet.\n");
printSquad("Home", SEED_MATCHUP.home, "home");
printSquad("Away", SEED_MATCHUP.away, "away");
