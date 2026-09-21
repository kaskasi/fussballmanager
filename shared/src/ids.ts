export type PlayerId = string & { readonly __brand: "PlayerId" };
export type TeamId = string & { readonly __brand: "TeamId" };
export type MatchId = string & { readonly __brand: "MatchId" };

export function asPlayerId(id: string): PlayerId {
  return id as PlayerId;
}

export function asTeamId(id: string): TeamId {
  return id as TeamId;
}

export function asMatchId(id: string): MatchId {
  return id as MatchId;
}
