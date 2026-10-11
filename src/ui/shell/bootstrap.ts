import { newGameSession, saveFromSession } from "../../persistence/game-session.ts";
import {
  loadLocalSave,
  removeLocalSave,
  writeLocalSave,
} from "../../persistence/local-save.ts";
import type { SaveGame } from "../../persistence/savegame-model.ts";
import type { CareerMatchSetup } from "../../sim/career-match-setup.ts";
import {
  DEFAULT_MARKET_FILTERS,
  DEFAULT_MARKET_SORT,
  type MarketFilters,
  type MarketSort,
} from "../../scouting/market-list.ts";
import type { NavPrimaryAction } from "../nav-primary-action.ts";
import type { Screen } from "./types.ts";

export function bootstrapSave(slot: number): SaveGame {
  try {
    const loaded = loadLocalSave(slot);
    if (loaded) return loaded;
  } catch {
    removeLocalSave(slot);
  }
  const fresh = saveFromSession(newGameSession());
  writeLocalSave(slot, fresh);
  return fresh;
}

/** Reset navigation overlays when switching save slots (PRD 08 session boundary). */
export function clearTransientUi(setters: {
  setProfileId: (value: string | null) => void;
  setForeignPlayerId: (value: string | null) => void;
  setPostfachItemId: (value: string | null) => void;
  setProfileFeedback: (value: string | null) => void;
  setCareerMatchSetup: (value: CareerMatchSetup | null) => void;
  setCareerMatchUiVisible: (value: boolean) => void;
  setMatchNavAction: (value: NavPrimaryAction | null) => void;
  setMarketFilters: (value: MarketFilters) => void;
  setMarketSort: (value: MarketSort) => void;
  setScreen: (value: Screen) => void;
}): void {
  setters.setProfileId(null);
  setters.setForeignPlayerId(null);
  setters.setPostfachItemId(null);
  setters.setProfileFeedback(null);
  setters.setCareerMatchSetup(null);
  setters.setCareerMatchUiVisible(true);
  setters.setMatchNavAction(null);
  setters.setMarketFilters(DEFAULT_MARKET_FILTERS);
  setters.setMarketSort(DEFAULT_MARKET_SORT);
  setters.setScreen("hub");
}
