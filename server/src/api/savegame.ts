import path from "node:path";
import {
  createSave,
  loadSave,
  removeSave,
  saveFolderName,
  saveToFolder,
  type NewSaveInput,
  type SaveGame,
} from "../../../src/persistence/savegame.ts";

export const SAVE_ROOT = process.env.SAVE_ROOT ?? path.resolve(process.cwd(), "saves");

export function saveDir(name: string, slot: number): string {
  return path.join(SAVE_ROOT, saveFolderName(name, slot));
}

export async function readFolderSave(name: string, slot: number): Promise<SaveGame> {
  return loadSave(saveDir(name, slot));
}

export async function writeFolderSave(
  name: string,
  slot: number,
  save: SaveGame,
  context: { weekend: boolean; simulating: boolean },
): Promise<void> {
  await saveToFolder(saveDir(name, slot), save, context);
}

export async function deleteFolderSave(name: string, slot: number): Promise<void> {
  await removeSave(saveDir(name, slot));
}

export function newFolderSave(input: NewSaveInput): SaveGame {
  return createSave(input);
}
