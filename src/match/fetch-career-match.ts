import type { MatchView, Squad, TeamId } from "@fussballmanager/shared";

export async function fetchCareerMatchView(input: {
  seed: number;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  playerClubSquad?: Squad;
}): Promise<MatchView> {
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
    throw new Error(`Career match request failed (${response.status})`);
  }
  return (await response.json()) as MatchView;
}
