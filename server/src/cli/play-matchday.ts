import { SEED_DIVISION } from "@fussballmanager/shared";
import { parseSeed } from "../commentary/index.ts";
import { clubName, playMatchday } from "../engine/matchday.ts";

const seed = parseSeed(process.argv);
const played = playMatchday({ squads: SEED_DIVISION, matchday: 1, baseSeed: seed });

console.log(`Matchday ${played.matchday}  (seed ${seed})`);
console.log("");
for (const fixture of played.fixtures) {
  const home = clubName(SEED_DIVISION, fixture.homeTeamId);
  const away = clubName(SEED_DIVISION, fixture.awayTeamId);
  console.log(
    `${home} ${fixture.homeGoals}–${fixture.awayGoals} ${away}   (${fixture.id}, ${fixture.eventCount} events)`,
  );
}
console.log("");
console.log("Table");
played.table.forEach((row, index) => {
  const name = clubName(SEED_DIVISION, row.teamId);
  const gd = row.goalDifference > 0 ? `+${row.goalDifference}` : `${row.goalDifference}`;
  console.log(
    `${String(index + 1).padStart(2)}. ${name.padEnd(22)}  ${row.played}  ${row.won} ${row.drawn} ${row.lost}  ${row.goalsFor}:${row.goalsAgainst} ${gd.padStart(3)}  ${row.points} pts`,
  );
});
