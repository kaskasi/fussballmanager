import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { listProSquad } from "./pro-roster.ts";

describe("pro roster", () => {
  it("lists only pro players from the club", () => {
    const pro = clonePlayer();
    pro.id = "pl_pro_1";
    pro.squad_status = "pro";
    pro.club_id = "cl_fc_nordstern";

    const youth = clonePlayer();
    youth.id = "pl_youth_1";
    youth.squad_status = "u17";
    youth.club_id = "cl_fc_nordstern";

    const rows = listProSquad([pro, youth], "cl_fc_nordstern");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.playerId).toBe("pl_pro_1");
    expect(rows[0]?.ca).toBeGreaterThan(0);
  });
});
