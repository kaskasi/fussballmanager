/** Local binding: browser slot → sync code (PRD 18). Code is secret — same as cloud password. */

const KEY_PREFIX = "fm_cloud_sync_slot_";

export interface CloudSlotMeta {
  syncCode: string;
  linkedAt: string;
}

export function readCloudSlotMeta(slot: number): CloudSlotMeta | null {
  const raw = localStorage.getItem(`${KEY_PREFIX}${slot}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CloudSlotMeta;
    if (!parsed.syncCode || typeof parsed.syncCode !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCloudSlotMeta(slot: number, syncCode: string): void {
  const meta: CloudSlotMeta = {
    syncCode: syncCode.trim().toLowerCase(),
    linkedAt: new Date().toISOString(),
  };
  localStorage.setItem(`${KEY_PREFIX}${slot}`, JSON.stringify(meta));
}

export function clearCloudSlotMeta(slot: number): void {
  localStorage.removeItem(`${KEY_PREFIX}${slot}`);
}
