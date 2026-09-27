import type { MatchView, Squad, TeamId } from "@fussballmanager/shared";

export async function fetchCareerMatchView(input: {
  seed: number;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  playerClubSquad?: Squad;
}): Promise<MatchView> {
  if (
    input.playerClubSquad &&
    input.playerClubSquad.team.id !== input.homeTeamId &&
    input.playerClubSquad.team.id !== input.awayTeamId
  ) {
    throw new Error(
      "Aufstellung passt nicht zum Spiel — bitte Seite neu laden und Aufstellung erneut bestätigen.",
    );
  }

  const response = await fetch("/api/career-match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        "Match-Server nicht erreichbar — bitte npm run dev:server im Projektroot starten.",
      );
    }
    let detail = "";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) detail = `: ${body.error}`;
    } catch {
      // ignore non-JSON error bodies
    }
    const staleServer =
      detail.includes("must belong to the player club") ||
      detail.includes("Unknown home or away team");
    const hint = staleServer
      ? " — bitte npm run dev:server neu starten (alter Match-Server läuft noch)."
      : "";
    throw new Error(`Career match request failed (${response.status})${detail}${hint}`);
  }
  return (await response.json()) as MatchView;
}
