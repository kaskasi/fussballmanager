const PREFIX = "camp-leader:";

export function campLeaderPostfachItemId(campId: string): string {
  return `${PREFIX}${campId}`;
}

export function parseCampLeaderPostfachItemId(itemId: string): string | null {
  if (!itemId.startsWith(PREFIX)) return null;
  const campId = itemId.slice(PREFIX.length);
  return campId.length > 0 ? campId : null;
}

export function isCampLeaderPostfachItemId(itemId: string): boolean {
  return parseCampLeaderPostfachItemId(itemId) != null;
}
