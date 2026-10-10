import { pushCloudSave } from "./cloud-save-client.ts";
import { readCloudSlotMeta } from "./cloud-slot-meta.ts";
import { isCloudSaveEnabled } from "./cloud-save-config.ts";
import type { SaveGame } from "./savegame-model.ts";

const pendingBySlot = new Map<number, ReturnType<typeof setTimeout>>();

export type CloudUploadListener = (result: { ok: true } | { ok: false; message: string }) => void;

let listener: CloudUploadListener | null = null;

export function setCloudUploadListener(next: CloudUploadListener | null): void {
  listener = next;
}

/** Debounced upload after local persist (PRD 18). */
export function scheduleCloudUpload(slot: number, save: SaveGame, delayMs = 2500): void {
  if (!isCloudSaveEnabled()) return;
  const meta = readCloudSlotMeta(slot);
  if (!meta) return;

  const existing = pendingBySlot.get(slot);
  if (existing) clearTimeout(existing);

  pendingBySlot.set(
    slot,
    setTimeout(() => {
      pendingBySlot.delete(slot);
      void pushCloudSave(meta.syncCode, save)
        .then(() => listener?.({ ok: true }))
        .catch((error) => {
          const message = error instanceof Error ? error.message : "cloud_upload_failed";
          listener?.({ ok: false, message });
        });
    }, delayMs),
  );
}

export async function uploadCloudSaveNow(slot: number, save: SaveGame): Promise<void> {
  const meta = readCloudSlotMeta(slot);
  if (!meta) throw new Error("cloud_slot_not_linked");
  await pushCloudSave(meta.syncCode, save);
}
