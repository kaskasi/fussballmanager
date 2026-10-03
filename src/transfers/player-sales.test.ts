import { describe, expect, it } from "vitest";
import { asTeamId, NORDSTERN_ID } from "@fussballmanager/shared";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { DEFAULT_CLUB_ID } from "../persistence/game-session.ts";
import {
  attemptPlayerSale,
  canSellPlayer,
  completeSale,
  pickAiBuyerClub,
} from "./player-sales.ts";

describe("player-sales", () => {
  const pro = clonePlayer();
  pro.id = "pl_sale_test";
  pro.club_id = DEFAULT_CLUB_ID;
  pro.squad_status = "pro";
  pro.position = "CM";

  it("blocks sales outside transfer windows", () => {
    const result = canSellPlayer(pro, [pro], DEFAULT_CLUB_ID, 10);
    expect(result.allowed).toBe(false);
  });

  it("allows pro sales in summer window", () => {
    const squad = Array.from({ length: 12 }, (_, index) => ({
      ...pro,
      id: index === 0 ? pro.id : `pl_${index}`,
      position: index === 1 ? "GK" : pro.position,
    }));
    const result = canSellPlayer(squad[0]!, squad, DEFAULT_CLUB_ID, 1);
    expect(result.allowed).toBe(true);
  });

  it("negotiates a sale fee in transfer window", () => {
    const deal = attemptPlayerSale(pro, 1, 1, 4242);
    expect(deal.accepted).toBe(true);
    expect(deal.fee).toBeGreaterThan(0);
  });

  it("moves sold player to buyer club", () => {
    const buyer = pickAiBuyerClub(
      [NORDSTERN_ID, asTeamId("tsv-holzweg")],
      pro.id,
      99,
      1,
      1,
    );
    const sold = completeSale(pro, buyer, 1);
    expect(sold.club_id).toBe(buyer);
    expect(sold.club_id).not.toBe(DEFAULT_CLUB_ID);
  });
});
