import { hasLocalSave, loadLocalSave } from "./local-save.ts";

export const MAX_SAVE_SLOTS = 3;
const ACTIVE_SLOT_KEY = "fm_active_slot";

export interface SaveSlotInfo {
  slot: number;
  occupied: boolean;
  corrupt?: boolean;
  label: string;
  lastPlayed?: string;
  managerName?: string;
  season?: number;
  week?: number;
}

export function getActiveSlot(): number {
  const raw = localStorage.getItem(ACTIVE_SLOT_KEY);
  const slot = raw ? Number(raw) : 1;
  if (!Number.isInteger(slot) || slot < 1 || slot > MAX_SAVE_SLOTS) {
    return 1;
  }
  return slot;
}

export function setActiveSlot(slot: number): void {
  if (!Number.isInteger(slot) || slot < 1 || slot > MAX_SAVE_SLOTS) {
    throw new Error(`Save slot must be between 1 and ${MAX_SAVE_SLOTS}`);
  }
  localStorage.setItem(ACTIVE_SLOT_KEY, String(slot));
}

export function peekSaveSlot(slot: number): SaveSlotInfo {
  if (!hasLocalSave(slot)) {
    return { slot, occupied: false, label: `Slot ${slot} — leer` };
  }
  try {
    const save = loadLocalSave(slot);
    if (!save) {
      return { slot, occupied: false, label: `Slot ${slot} — leer` };
    }
    return {
      slot,
      occupied: true,
      label: `Slot ${slot} · S${save.state.season} W${save.state.week}`,
      lastPlayed: save.manifest.last_played,
      managerName: save.manifest.manager_name,
      season: save.state.season,
      week: save.state.week,
    };
  } catch {
    return { slot, occupied: true, corrupt: true, label: `Slot ${slot} — beschädigt` };
  }
}

export function listSaveSlots(): SaveSlotInfo[] {
  return Array.from({ length: MAX_SAVE_SLOTS }, (_, index) => peekSaveSlot(index + 1));
}
