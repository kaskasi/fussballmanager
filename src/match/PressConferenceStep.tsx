/** WIREFRAME: docs/prd/28_press_conferences.md — Pressekonferenz (Schritt im Spielablauf, vor Anpfiff / nach dem Bericht) */
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Heart, Landmark, Megaphone, Mic, Newspaper, UserRound, Users } from "lucide-react";
import { formatDecimal } from "../i18n/number-display.ts";
import { useT } from "../i18n/react.ts";
import {
  pressAnswerText,
  pressJournalistName,
  pressJournalistRole,
  pressQuestionText,
  pressToneLabel,
} from "../i18n/press-display.ts";
import type { StoryCast } from "../narrative/story-state.ts";
import type { PressConference, PressQuestion } from "../press/press-conference.ts";
import {
  sessionPressState,
  type PressAnswer,
  type PressMatchContext,
  type PressResolution,
} from "../press/press-session.ts";
import {
  addPressEffects,
  emptyPressEffects,
  PRESS_TONES,
  type PressEffects,
  type PressPhase,
  type PressTone,
} from "../press/press-state.ts";
import { PRESS_BOYCOTT_LINE, PRESS_CAMPAIGN_LINE } from "../press/press-week.ts";
import type { AssistantQualityTier } from "../staff/assistant-delegation.ts";
import type { NavPrimaryAction } from "../ui/nav-primary-action.ts";

/** What the match flow needs from the save to hold a presser (built by the shell). */
export interface PressConferenceBridge {
  cast: StoryCast;
  relationship: number;
  assistantTier: AssistantQualityTier;
  conferenceFor: (phase: PressPhase, context: PressMatchContext) => PressConference | null;
  preview: (question: PressQuestion, tone: PressTone) => PressEffects;
  resolve: (conference: PressConference, answer: PressAnswer) => PressResolution;
}

type EffectKey = "squad" | "relationship" | "hype" | "pressure" | "fanbase";

/** Board pressure is the one value where "up" is bad news. */
const EFFECT_ROWS: readonly { key: EffectKey; icon: ReactNode; goodWhenUp: boolean }[] = [
  { key: "squad", icon: <Users className="tc-icon" aria-hidden />, goodWhenUp: true },
  { key: "relationship", icon: <Newspaper className="tc-icon" aria-hidden />, goodWhenUp: true },
  { key: "hype", icon: <Megaphone className="tc-icon" aria-hidden />, goodWhenUp: true },
  { key: "pressure", icon: <Landmark className="tc-icon" aria-hidden />, goodWhenUp: false },
  { key: "fanbase", icon: <Heart className="tc-icon" aria-hidden />, goodWhenUp: true },
];

function signed(value: number, digits = 0): string {
  const text = formatDecimal(Math.abs(value), digits);
  if (value > 0) return `+${text}`;
  if (value < 0) return `−${text}`;
  return "±0";
}

function tone(value: number, goodWhenUp: boolean): "up" | "down" | "flat" {
  if (value === 0) return "flat";
  return value > 0 === goodWhenUp ? "up" : "down";
}

function ToneHints({ effects }: { effects: PressEffects }) {
  const t = useT();
  const rows = EFFECT_ROWS.filter((row) => effects[row.key] !== 0);
  if (rows.length === 0) return null;
  return (
    <span className="press__hints">
      {rows.map((row) => {
        const value = effects[row.key];
        const mood = tone(value, row.goodWhenUp);
        const label = t(`press.effect.${row.key}`);
        return (
          <span
            key={row.key}
            className={`press__hint press__hint--${mood}`}
            title={label}
            aria-label={t(value > 0 ? "press.hint.up" : "press.hint.down", { label })}
          >
            {row.icon}
            {value > 0 ? (
              <ArrowUp className="tc-icon press__arrow" aria-hidden />
            ) : (
              <ArrowDown className="tc-icon press__arrow" aria-hidden />
            )}
          </span>
        );
      })}
    </span>
  );
}

function RelationshipMeter({ value, after }: { value: number; after?: number }) {
  const t = useT();
  const shown = after ?? value;
  const band =
    shown < PRESS_BOYCOTT_LINE ? "boycott" : shown < PRESS_CAMPAIGN_LINE ? "hostile" : shown < 50 ? "cool" : shown < 70 ? "neutral" : "warm";
  return (
    <div className="press__meter">
      <div className="press__meter-head">
        <span className="tc-label">{t("press.relationship")}</span>
        <strong>
          {shown}
          {after != null && after !== value ? <span className="tc-caption"> ({signed(after - value)})</span> : null}
        </strong>
      </div>
      <div
        className="press__meter-track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={shown}
        aria-label={t("press.relationship")}
      >
        <span className="press__meter-zone press__meter-zone--boycott" style={{ width: `${PRESS_BOYCOTT_LINE}%` }} />
        <span
          className="press__meter-zone press__meter-zone--hostile"
          style={{ left: `${PRESS_BOYCOTT_LINE}%`, width: `${PRESS_CAMPAIGN_LINE - PRESS_BOYCOTT_LINE}%` }}
        />
        <span className="press__meter-marker" style={{ left: `${shown}%` }} />
      </div>
      <p className="tc-caption">{t(`press.relationship.${band}`)}</p>
    </div>
  );
}

function EffectSummary({ effects, title }: { effects: PressEffects; title: string }) {
  const t = useT();
  const playerSwings = Object.values(effects.players).filter((value) => value !== 0).length;
  return (
    <section className="press__effects" aria-label={title}>
      <p className="tc-label">{title}</p>
      <dl className="tc-kv">
        {EFFECT_ROWS.map((row) => {
          const value = effects[row.key];
          return (
            <div key={row.key} className="press__effect-row">
              <dt>
                {row.icon}
                {t(`press.effect.${row.key}`)}
              </dt>
              <dd className={`press__delta press__delta--${tone(value, row.goodWhenUp)}`}>
                {signed(value, row.key === "fanbase" ? 1 : 0)}
              </dd>
            </div>
          );
        })}
      </dl>
      {playerSwings > 0 ? (
        <p className="tc-caption">{t("press.effect.players", { count: playerSwings })}</p>
      ) : null}
    </section>
  );
}

export function PressConferenceStep({
  conference,
  bridge,
  opponentName,
  onNavActionChange,
  onDone,
}: {
  conference: PressConference;
  bridge: PressConferenceBridge;
  opponentName: string;
  onNavActionChange: (action: NavPrimaryAction | null) => void;
  onDone: (resolution: PressResolution) => void;
}) {
  const t = useT();
  const [answers, setAnswers] = useState<(PressTone | null)[]>(() => conference.questions.map(() => null));
  const [resolution, setResolution] = useState<PressResolution | null>(null);
  // The bridge follows the live save; the meter compares against the value before this presser.
  const [relationshipBefore] = useState(bridge.relationship);
  const complete = answers.every((answer) => answer != null);
  const assistant = bridge.cast.assistant_name;
  // Parents pass fresh callbacks every render (and re-render on each NEXT update); read the latest
  // through refs so registering NEXT does not loop.
  const bridgeRef = useRef(bridge);
  bridgeRef.current = bridge;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const expected = useMemo(
    () =>
      conference.questions.reduce(
        (sum, question, index) =>
          answers[index] ? addPressEffects(sum, bridge.preview(question, answers[index]!)) : sum,
        emptyPressEffects(),
      ),
    [answers, bridge, conference.questions],
  );

  useLayoutEffect(() => {
    if (resolution) {
      onNavActionChange({
        label: conference.phase === "pre" ? t("press.nav.kickoff") : t("match.career.nav.finishMatchday"),
        onClick: () => onDoneRef.current(resolution),
        title: conference.phase === "pre" ? t("press.nav.kickoffHint") : t("match.career.nav.finishHint"),
      });
    } else {
      onNavActionChange({
        label: t("press.nav.submit"),
        onClick: () => {
          if (!complete) return;
          setResolution(bridgeRef.current.resolve(conference, answers as PressTone[]));
        },
        disabled: !complete,
        title: complete ? t("press.nav.submitHint") : t("press.nav.answerAll"),
      });
    }
    return () => onNavActionChange(null);
  }, [answers, complete, conference, onNavActionChange, resolution, t]);

  const tones = resolution ? resolution.record.tones : answers;

  return (
    <main className="matchday career-match tc-match press-step">
      <div className="tc-split tc-match__split">
        <div className="tc-stack tc-match__main">
          <section className="tc-panel press" aria-labelledby="press-title">
            <div className="tc-panel__head">
              <div>
                <p className="tc-label">{t(`press.kicker.${conference.phase}`, { opponent: conference.opponentName ?? opponentName })}</p>
                <h2 className="tc-panel__title" id="press-title">
                  {t(`press.title.${conference.phase}`)}
                </h2>
              </div>
            </div>
            {conference.boycott ? (
              <p className="tc-callout tc-callout--warn">{t("press.boycott", { ally: bridge.cast.journalist_ally_name })}</p>
            ) : null}
            <ol className="press__questions">
              {conference.questions.map((question, index) => {
                const chosen = tones[index] ?? null;
                return (
                  <li key={question.id} className="press__item">
                    <p className="press__asker">
                      <Mic className="tc-icon" aria-hidden />
                      <strong>{pressJournalistName(question.journalist, bridge.cast)}</strong>
                      <span className="tc-caption">{pressJournalistRole(question.journalist)}</span>
                    </p>
                    <blockquote className="press__question">{pressQuestionText(question, conference.phase)}</blockquote>
                    <div className="press__tones" role="radiogroup" aria-label={t("press.tonesAria", { index: index + 1 })}>
                      {PRESS_TONES.map((option) => (
                        <button
                          key={option}
                          type="button"
                          role="radio"
                          aria-checked={chosen === option}
                          className={`press__tone${chosen === option ? " is-chosen" : ""}`}
                          disabled={resolution != null}
                          onClick={() =>
                            setAnswers((current) => current.map((value, at) => (at === index ? option : value)))
                          }
                        >
                          <span className="press__tone-label">{pressToneLabel(option)}</span>
                          <ToneHints effects={bridge.preview(question, option)} />
                        </button>
                      ))}
                    </div>
                    {chosen ? <p className="press__answer">{pressAnswerText(question, chosen)}</p> : null}
                  </li>
                );
              })}
            </ol>
            {resolution ? (
              resolution.record.delegated ? (
                <p className="tc-callout">{t("press.delegated", { assistant })}</p>
              ) : null
            ) : (
              <div className="press__delegate">
                <button
                  type="button"
                  className="tc-btn"
                  onClick={() => setResolution(bridge.resolve(conference, "delegate"))}
                >
                  <UserRound className="tc-icon" aria-hidden />
                  {t("press.delegate", { assistant })}
                </button>
                <p className="tc-caption">{t(`press.delegateHint.${bridge.assistantTier}`, { assistant })}</p>
              </div>
            )}
          </section>
        </div>
        <aside className="tc-panel press__side" aria-label={t("press.sideAria")}>
          <RelationshipMeter
            value={relationshipBefore}
            after={resolution ? sessionPressState(resolution.session).relationship : undefined}
          />
          <EffectSummary
            effects={resolution ? resolution.record.effects : expected}
            title={resolution ? t("press.effects.done") : t("press.effects.expected")}
          />
          {conference.phase === "pre" && !resolution ? (
            <p className="tc-caption">{t("press.preMatchNote")}</p>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
