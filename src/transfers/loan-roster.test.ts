import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { listLoanedPlayers, loanClubName } from "./loan-roster.ts";

describe("loan roster", () => {
  it("lists loaned players with club and CA", () => {
    const player = clonePlayer();
    player.id = "pl_loan_1";
    player.squad_status = "loaned_out";
    player.current_loan = {
      from_club: "cl_fc_nordstern",
      to_club: "cl_loan_partner",
      until_season: 4,
      has_option: true,
      minute_guarantee: 900,
    };
    const rows = listLoanedPlayers([player]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.toClubName).toBe(loanClubName("cl_loan_partner"));
    expect(rows[0]?.ca).toBeGreaterThan(0);
  });
});
