import { NORDSTERN_ID } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { defaultBoardState } from "../board/board-state.ts";
import { startBoardSeason } from "../board/season-objectives.ts";
import { defaultClubFinances } from "./club-finances.ts";
import {
  boardCashFloor,
  needsSpendConfirm,
  spendRunway,
} from "./spend-runway.ts";

describe("spend runway", () => {
  it("asks for confirm at 100k or a full wage week", () => {
    expect(needsSpendConfirm(95_000, 120_000)).toBe(false);
    expect(needsSpendConfirm(95_000, 80_000)).toBe(true);
    expect(needsSpendConfirm(100_000, 80_000)).toBe(true);
    expect(needsSpendConfirm(50_000, 40_000)).toBe(true);
  });

  it("flags a buy that would miss the board cash floor", () => {
    const board = startBoardSeason(defaultBoardState(), NORDSTERN_ID, 1);
    const floor = boardCashFloor(board);
    expect(floor).toBe(3_500_000);
    const runway = spendRunway(defaultClubFinances(), 50_000, 2_500_000, floor);
    expect(runway.belowFloor).toBe(true);
    expect(runway.cashAfter).toBe(defaultClubFinances().cash - 2_500_000);
  });
});
