import { describe, expect, it } from "vitest";
import {
  AUGUST_MONTH_INDEX,
  civilTransferWindow,
  isCivilTransferWindowLastDay,
  JANUARY_MONTH_INDEX,
  TRANSFER_WINDOW_DAYS,
} from "./transfer-window-dates.ts";

describe("civil transfer window dates", () => {
  it("marks first four weeks in August and January", () => {
    expect(civilTransferWindow(AUGUST_MONTH_INDEX, 1)).toBe("summer");
    expect(civilTransferWindow(AUGUST_MONTH_INDEX, TRANSFER_WINDOW_DAYS)).toBe("summer");
    expect(civilTransferWindow(AUGUST_MONTH_INDEX, TRANSFER_WINDOW_DAYS + 1)).toBeNull();
    expect(civilTransferWindow(JANUARY_MONTH_INDEX, 14)).toBe("winter");
    expect(civilTransferWindow(6, 15)).toBeNull();
  });

  it("flags last day of each window", () => {
    expect(isCivilTransferWindowLastDay(AUGUST_MONTH_INDEX, TRANSFER_WINDOW_DAYS)).toBe(true);
    expect(isCivilTransferWindowLastDay(JANUARY_MONTH_INDEX, TRANSFER_WINDOW_DAYS)).toBe(true);
    expect(isCivilTransferWindowLastDay(AUGUST_MONTH_INDEX, 1)).toBe(false);
  });
});
