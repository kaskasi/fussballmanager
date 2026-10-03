import type { FormationId } from "@fussballmanager/shared";
import type { Player } from "../types/player.ts";
import type { CareerMatchSetup } from "../sim/career-match-setup.ts";
import { clubShortName } from "../sim/league-week.ts";
import { buildOpponentLineupPreview } from "./opponent-lineup-preview.ts";

export interface PreMatchBrief {
  matchday: number;
  isHome: boolean;
  playerClubShortName: string;
  opponentShortName: string;
  playerFormation: FormationId;
  opponentFormation: FormationId | null;
  colorLine: string;
}

function hashSeed(parts: readonly (string | number)[]): number {
  let hash = 0;
  for (const part of parts) {
    const text = String(part);
    for (let index = 0; index < text.length; index += 1) {
      hash = Math.imul(hash ^ text.charCodeAt(index), 0x9e3779b1);
    }
  }
  return hash >>> 0;
}

function pickColorLine(
  seed: number,
  ctx: {
    isHome: boolean;
    playerFormation: FormationId;
    opponentFormation: FormationId | null;
    opponentShortName: string;
    matchday: number;
  },
): string {
  const opponentFormation = ctx.opponentFormation ?? "unbekannt";
  const templates: readonly string[] = [
    `Mit dem ${ctx.playerFormation} setzen wir heute auf Struktur — ${ctx.opponentShortName} antwortet in ${opponentFormation}.`,
    ctx.isHome
      ? `Heimvorteil, volles Haus: ${ctx.opponentShortName} muss das Tempo akzeptieren.`
      : `Auswärts bei ${ctx.opponentShortName}: Geduld zahlt sich aus, wenn der Block steht.`,
    `Spieltag ${ctx.matchday}: Wer die Zweikämpfe früh gewinnt, legt den Ton für die nächsten neunzig Minuten.`,
    ctx.opponentFormation
      ? `Das Duell ${ctx.playerFormation} gegen ${ctx.opponentFormation} entscheidet sich oft in der Halbfeldmitte.`
      : `Unser ${ctx.playerFormation} muss heute sauber verteidigen und schnell umschalten.`,
    ctx.isHome
      ? `Der Rasen ist bereit — ${ctx.opponentShortName} darf hier keinen leichten Nachmittag erwarten.`
      : `Lauter Auswärtsblock: ${ctx.opponentShortName} spielt auf Konter — Konzentration von der ersten Minute.`,
  ];

  const index = hashSeed([seed, "prematch-color", ctx.matchday, ctx.playerFormation]) % templates.length;
  return templates[index]!;
}

export function buildPreMatchBrief(
  setup: CareerMatchSetup,
  playerFormation: FormationId,
  rivalPlayers: readonly Player[],
): PreMatchBrief {
  const opponent = buildOpponentLineupPreview(setup, rivalPlayers);

  return {
    matchday: setup.matchday,
    isHome: setup.isHome,
    playerClubShortName: clubShortName(setup.playerClubId),
    opponentShortName: setup.opponentShortName,
    playerFormation,
    opponentFormation: opponent?.formation ?? null,
    colorLine: pickColorLine(setup.seed, {
      isHome: setup.isHome,
      playerFormation,
      opponentFormation: opponent?.formation ?? null,
      opponentShortName: setup.opponentShortName,
      matchday: setup.matchday,
    }),
  };
}
