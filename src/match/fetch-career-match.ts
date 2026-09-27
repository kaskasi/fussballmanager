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
    let detail = "";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) detail = `: ${body.error}`;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(`Career match request failed (${response.status})${detail}`);
  }
  return (await response.json()) as MatchView;
}
