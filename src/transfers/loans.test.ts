import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  canLoanPlayerOut,
  canRecallLoan,
  countActiveLoansOut,
  loanYouthPlayer,
  MAX_LOANS_OUT_PER_CLUB,
  recallLoanPlayer,
} from "./loans.ts";
import { loanPlayerOut } from "./transfer-history.ts";

const CLUB = "cl_fc_nordstern";

describe("loans F5.3", () => {
  it("blocks loans outside transfer windows", () => {
    const player = clonePlayer();
    player.squad_status = "u19";
    expect(canLoanPlayerOut([player], CLUB, 10, player).allowed).toBe(false);
    expect(canLoanPlayerOut([player], CLUB, 1, player).allowed).toBe(true);
    expect(canLoanPlayerOut([player], CLUB, 20, player).allowed).toBe(true);
  });

  it("enforces max five outgoing loans", () => {
    const players = Array.from({ length: MAX_LOANS_OUT_PER_CLUB }, (_, index) => {
      const player = clonePlayer();
      player.id = `pl_loan_cap_${index}`;
      const loaned = loanPlayerOut(player, 1, 1, CLUB);
      return loaned.player;
    });
    const next = clonePlayer();
    next.id = "pl_loan_cap_extra";
    next.squad_status = "u19";
    expect(countActiveLoansOut(players, CLUB)).toBe(MAX_LOANS_OUT_PER_CLUB);
    expect(canLoanPlayerOut(players, CLUB, 1, next).allowed).toBe(false);
  });

  it("records loan fee on loan out", () => {
    const player = clonePlayer();
    player.squad_status = "u19";
    player.age = 17;
    const { record, fee } = loanYouthPlayer(player, 1, 1, CLUB);
    expect(record.kind).toBe("loan_out");
    expect(fee).toBeGreaterThan(0);
    expect(record.fee).toBe(fee);
  });

  it("allows recall only in the winter window", () => {
    const player = clonePlayer();
    player.squad_status = "loaned_out";
    player.current_loan = {
      from_club: CLUB,
      to_club: "cl_loan_partner",
      until_season: 2,
      has_option: true,
    };
    expect(canRecallLoan(10, player).allowed).toBe(false);
    expect(canRecallLoan(20, player).allowed).toBe(true);
    const recalled = recallLoanPlayer(player, 1, 20);
    expect(recalled?.player.squad_status).toBe("pro");
    expect(recalled?.record.kind).toBe("loan_return");
  });
});
