/** PRD 28 — press conference text in the active language (`press.*`). */

import type { StoryCast } from "../narrative/story-state.ts";
import type { PressJournalist, PressQuestion, PressQuestionKind } from "../press/press-conference.ts";
import type { PressPhase, PressTone } from "../press/press-state.ts";
import { precinctBuildingLabel, type PrecinctBuilding } from "../stadium/precinct.ts";
import { t } from "./index.ts";
import { formatEuroWhole } from "./number-display.ts";
import { youthCampNationLabel } from "./youth-camp-display.ts";

type AnswerCategory =
  | "player"
  | "result_win"
  | "result_draw"
  | "result_loss"
  | "key_match"
  | "investment"
  | "transfer_out"
  | "job_pressure"
  | "leak"
  | "generic";

function answerCategory(kind: PressQuestionKind): AnswerCategory {
  switch (kind) {
    case "transfer_in":
    case "standout_player":
    case "star_benched":
    case "youth_start":
      return "player";
    case "result_win":
    case "result_draw":
    case "result_loss":
    case "transfer_out":
    case "job_pressure":
      return kind;
    case "derby":
    case "six_pointer":
    case "title_race":
    case "finale":
      return "key_match";
    case "youth_camp":
    case "stadium":
    case "training_facility":
    case "academy":
    case "sponsor":
      return "investment";
    case "dressing_room_leak":
      return "leak";
    default:
      return "generic";
  }
}

function lookup(keys: readonly string[], params: Record<string, string | number>): string {
  for (const key of keys) {
    const value = t(key, params);
    if (value !== key) return value;
  }
  return keys[keys.length - 1]!;
}

function questionParams(question: PressQuestion): Record<string, string | number> {
  const params: Record<string, string | number> = { ...question.params };
  if (typeof params.fee === "number") params.fee = formatEuroWhole(params.fee);
  if (typeof params.camp === "string") params.camp = youthCampNationLabel(params.camp, params.camp);
  if (typeof params.block === "string") params.block = t(`stadium.block.${params.block}`);
  if (typeof params.building === "string") {
    params.building = precinctBuildingLabel(params.building as PrecinctBuilding);
  }
  if (typeof params.facility === "string") params.facility = t(`youth.facility.${params.facility}.name`);
  return params;
}

export function pressQuestionText(question: PressQuestion, phase: PressPhase): string {
  const stage = typeof question.params.stage === "string" ? `.${question.params.stage}` : "";
  return lookup(
    [
      `press.q.${question.kind}${stage}.${phase}`,
      `press.q.${question.kind}${stage}`,
      `press.q.${question.kind}.${phase}`,
      `press.q.${question.kind}`,
    ],
    questionParams(question),
  );
}

export function pressAnswerText(question: PressQuestion, tone: PressTone): string {
  return lookup([`press.answer.${answerCategory(question.kind)}.${tone}`], questionParams(question));
}

export function pressToneLabel(tone: PressTone): string {
  return t(`press.tone.${tone}`);
}

export function pressJournalistName(journalist: PressJournalist, cast: StoryCast): string {
  return journalist === "ally" ? cast.journalist_ally_name : cast.journalist_hostile_name;
}

export function pressJournalistRole(journalist: PressJournalist): string {
  return t(`press.journalist.${journalist}`);
}
