/** Engine roster rows may lack career `portrait_seed` — stable synthetic seed from id. */
export function portraitSeedFromPlayerId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 9999) + 1;
}

export function resolvePortraitSeed(
  playerId: string,
  lookup?: (id: string) => number | undefined,
): number {
  return lookup?.(playerId) ?? portraitSeedFromPlayerId(playerId);
}
