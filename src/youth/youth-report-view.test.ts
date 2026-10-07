import { describe, expect, it } from "vitest";
import { defaultTrainingPlan, emptyWeeklyTrainingPlan } from "../development/training-units.ts";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { emptyInbox } from "./decision-inbox.ts";
import {
  coachIconCounts,
  formatYouthReportName,
  resolveYouthReportDrop,
  youthReportStatus,
  youthReportTarget,
} from "./youth-report-view.ts";

describe("youth report view (PRD 14.4)", () => {
  it("formats names as last, initial", () => {
    const player = clonePlayer();
    player.name = { first: "Jonas", last: "Wolf" };
    expect(formatYouthReportName(player)).toBe("Wolf, J.");
  });

  it("counts coach icons even before the first youth match", () => {
    const player = clonePlayer();
    player.squad_status = "u17";
    player.id = "pl_u17";
    const inbox = emptyInbox(1);
    inbox.coachIcons = { pl_u17: "🚀" };
    expect(coachIconCounts([player], inbox, null, "u17")).toEqual({
      "🚀": 1,
      "➡️": 0,
      "⚠️": 0,
      "😞": 0,
    });
  });

  it("marks a missing youth contract as due", () => {
    const player = clonePlayer();
    player.squad_status = "u17";
    player.age = 16;
    player.contract = null;
    const status = youthReportStatus(player, emptyInbox(1), 1, null);
    expect(status).toEqual({ icon: "✍️", label: "fällig", kind: "contract" });
  });

  it("maps team focus to a physis/technik/mental target", () => {
    const player = clonePlayer();
    const target = youthReportTarget(player, [], defaultTrainingPlan(), 1);
    expect(target).toEqual({ icon: "🎯", title: "Technik", progress: null });
  });

  it("does not throw when the weekly plan is empty (F2.1 after week sim)", () => {
    const player = clonePlayer();
    const target = youthReportTarget(player, [], emptyWeeklyTrainingPlan(), 1);
    expect(target.title).toBe("Kein Plan");
  });

  it("drops a badge onto a matching inbox action", () => {
    const player = clonePlayer();
    player.id = "pl_youth";
    player.squad_status = "u17";
    player.age = 16;
    player.contract = null;
    const inbox = emptyInbox(1);
    inbox.items = [
      {
        id: "in_contract",
        playerId: player.id,
        kind: "contract_offer",
        week: 1,
        urgency: "now",
        reason: "contract_due",
      },
    ];
    expect(resolveYouthReportDrop(inbox, [player], "cl_fc_nordstern", 1, player.id, "contract")).toEqual({
      kind: "decide",
      itemId: "in_contract",
      action: "contract",
    });
    expect(resolveYouthReportDrop(inbox, [player], "cl_fc_nordstern", 1, player.id, "promote")).toEqual({
      kind: "inbox",
      itemId: "in_contract",
    });
  });

  it("opens the dossier when the player has no inbox item", () => {
    const player = clonePlayer();
    expect(resolveYouthReportDrop(emptyInbox(1), [player], "cl_fc_nordstern", 1, player.id, "loan")).toEqual({
      kind: "profile",
      playerId: player.id,
    });
  });
});
