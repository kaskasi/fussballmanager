/** PRD 18 — Sync-Code format `fuss-XXXX-XXXX`. */

const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

export function normalizeSyncCodeInput(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "");
}

export function isValidSyncCode(code: string): boolean {
  return /^fuss-[23456789abcdefghjkmnpqrstuvwxyz]{4}-[23456789abcdefghjkmnpqrstuvwxyz]{4}$/.test(
    normalizeSyncCodeInput(code),
  );
}

export function generateSyncCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const part = (offset: number) => {
    let out = "";
    for (let i = 0; i < 4; i += 1) {
      out += ALPHABET[bytes[offset + i]! % ALPHABET.length];
    }
    return out;
  };
  return `fuss-${part(0)}-${part(4)}`;
}
