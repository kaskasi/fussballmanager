import type { SaveGame } from "./savegame-model.ts";
import { normalizeSave, writeLocalSave } from "./local-save.ts";

export function saveExportFilename(save: SaveGame): string {
  const manager = save.manifest.manager_name.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 24);
  return `fussballmanager_${manager}_s${save.state.season}_w${save.state.week}.json`;
}

export function parseSaveJson(raw: string): SaveGame {
  const parsed = JSON.parse(raw) as SaveGame;
  return normalizeSave(parsed);
}

export function importSaveJson(raw: string, slot: number): SaveGame {
  const save = parseSaveJson(raw);
  writeLocalSave(slot, save);
  return save;
}

export function serializeSaveForExport(save: SaveGame): string {
  return `${JSON.stringify(save, null, 2)}\n`;
}

export function downloadSaveAsFile(save: SaveGame): void {
  const blob = new Blob([serializeSaveForExport(save)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = saveExportFilename(save);
  anchor.click();
  URL.revokeObjectURL(url);
}
