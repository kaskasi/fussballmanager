import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { emptyTransferState } from "./negotiations.ts";
import {
  appendTransferRecord,
  loanPlayerOut,
  processLoanReturns,
  recordsForSeason,
} from "./transfer-history.ts";

describe("transfer history", () => {
  it("records loan out and returns player after season", () => {
    const player = clonePlayer();
    player.id = "pl_loan_hist";
    player.squad_status = "u19";
    player.age = 17;

    const { player: loaned, record } = loanPlayerOut(player, 1, 8, "cl_fc_nordstern");
    expect(loaned.squad_status).toBe("loaned_out");
    expect(record.kind).toBe("loan_out");

    const state = appendTransferRecord(emptyTransferState(), record);
    expect(state.history).toHaveLength(1);

    const { players, records } = processLoanReturns([loaned], 1, 35);
    expect(records).toHaveLength(1);
    expect(records[0]?.kind).toBe("loan_return");
    expect(players[0]?.squad_status).toBe("u19");
    expect(players[0]?.current_loan).toBeUndefined();
  });

  it("keeps multi-season loans until the agreed season ends", () => {
    const player = clonePlayer();
    player.squad_status = "loaned_out";
    player.current_loan = {
      from_club: "cl_fc_nordstern",
      to_club: "cl_loan_partner",
      until_season: 3,
      has_option: false,
    };

    const afterSeason1 = processLoanReturns([player], 1, 35);
    expect(afterSeason1.records).toHaveLength(0);
    expect(afterSeason1.players[0]?.squad_status).toBe("loaned_out");

    const afterSeason2 = processLoanReturns(afterSeason1.players, 2, 35);
    expect(afterSeason2.records).toHaveLength(1);
  });

  it("filters records by season", () => {
    const state = appendTransferRecord(emptyTransferState(), {
      season: 1,
      week: 4,
      kind: "in",
      player_id: "pl_1",
      player_name: "Test",
      other_club_id: "cl_a",
      other_club_name: "Club A",
      fee: 1000,
    });
    const withSeason2 = appendTransferRecord(state, {
      season: 2,
      week: 1,
      kind: "loan_return",
      player_id: "pl_1",
      player_name: "Test",
      other_club_id: "cl_b",
      other_club_name: "Club B",
    });
    expect(recordsForSeason(withSeason2.history, 1)).toHaveLength(1);
    expect(recordsForSeason(withSeason2.history, 2)).toHaveLength(1);
  });
});
