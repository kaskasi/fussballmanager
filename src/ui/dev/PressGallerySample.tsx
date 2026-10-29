/** UI gallery — PRD 28 press conference step on a fresh career, with a stand-in header NEXT. */
import { useMemo, useState } from "react";
import { PressConferenceStep, type PressConferenceBridge } from "../../match/PressConferenceStep.tsx";
import { newGameSession, type GameSession } from "../../persistence/game-session.ts";
import { buildPressConference, pressAnswerEffects } from "../../press/press-conference.ts";
import { resolvePressConference, sessionPressState } from "../../press/press-session.ts";
import type { PressPhase } from "../../press/press-state.ts";
import { assistantQuality, assistantQualityTier } from "../../staff/assistant-delegation.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import type { NavPrimaryAction } from "../nav-primary-action.ts";

function sampleConference(session: GameSession, phase: PressPhase) {
  const pros = session.players.filter((player) => player.club_id === session.clubId && player.squad_status === "pro");
  const signing = pros[0]!;
  return buildPressConference({
    phase,
    fixtureKey: `gallery:${phase}`,
    seed: 2026,
    relationship: sessionPressState(session).relationship,
    boycott: false,
    topics: [
      {
        id: "transfer:gallery",
        kind: "transfer_in",
        playerId: signing.id,
        params: { player: formatPlayerName(signing), club: "SC Lübeck", fee: 1_250_000 },
      },
      { id: "key:gallery:derby", kind: "derby", params: { opponent: "Holstein" } },
    ],
    leakPending: false,
    players: session.players,
    clubId: session.clubId,
    result: phase === "post" ? "loss" : undefined,
    goalsFor: 1,
    goalsAgainst: 3,
    opponentName: "Holstein",
    boardPressure: 60,
  });
}

export function PressGallerySample() {
  const base = useMemo(() => newGameSession(new Date("2026-08-01T12:00:00Z")), []);
  const [session, setSession] = useState(base);
  const [phase, setPhase] = useState<PressPhase>("pre");
  const [round, setRound] = useState(0);
  const [next, setNext] = useState<NavPrimaryAction | null>(null);
  const conference = useMemo(() => sampleConference(base, phase), [base, phase]);

  const bridge = useMemo<PressConferenceBridge>(
    () => ({
      cast: session.storyState.cast,
      relationship: sessionPressState(session).relationship,
      assistantTier: assistantQualityTier(assistantQuality(session.coachingStaff)),
      conferenceFor: () => conference,
      preview: (question, tone) => pressAnswerEffects(question, tone, { players: session.players, clubId: session.clubId }),
      resolve: (target, answer) => {
        const resolution = resolvePressConference(session, target, answer);
        setSession(resolution.session);
        return resolution;
      },
    }),
    [conference, session],
  );

  return (
    <div className="tc-stack">
      <div className="tc-chips">
        {(["pre", "post"] as const).map((option) => (
          <button
            key={option}
            type="button"
            className="tc-chip"
            aria-pressed={phase === option}
            onClick={() => {
              setPhase(option);
              setSession(base);
              setRound((value) => value + 1);
            }}
          >
            {option === "pre" ? "Before kick-off" : "After a 1:3 defeat"}
          </button>
        ))}
        <button
          type="button"
          className="tc-next"
          disabled={!next || next.disabled}
          title={next?.title}
          onClick={() => next?.onClick()}
        >
          {next?.label ?? "Next"}
        </button>
      </div>
      <PressConferenceStep
        key={`${phase}:${round}`}
        conference={conference}
        bridge={bridge}
        opponentName="Holstein"
        onNavActionChange={setNext}
        onDone={() => {
          setSession(base);
          setRound((value) => value + 1);
        }}
      />
    </div>
  );
}
