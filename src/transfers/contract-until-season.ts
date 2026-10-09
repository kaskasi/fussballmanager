/**
 * PRD 05 — Profiverträge und Leihen enden am Sommerfenster vor `until_season`
 * (gleiche Semantik wie `current_loan.until_season`).
 */
export function contractUntilSeasonAfterTerm(
  signingSeason: number,
  fullSeasonTerms: number,
): number {
  const terms = Math.max(1, Math.round(fullSeasonTerms));
  return signingSeason + terms;
}

/** Sommerfenster-Saison, in der der Vertrag ausläuft (Anzeige). */
export function contractExpirySummerSeason(untilSeason: number): number {
  return untilSeason;
}
