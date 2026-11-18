/**
 * Same hash as `seededRoll` in `sim/division-matchday.ts`, kept here so the
 * cup tie and shootout modules do not import the squad/division modules.
 */
export function cupRoll(seed: number, salt: number): number {
  let hash = seed ^ salt;
  hash = Math.imul(hash ^ 0x517cc1b7, 0x9e3779b1);
  return ((hash >>> 0) % 10_000) / 10_000;
}
