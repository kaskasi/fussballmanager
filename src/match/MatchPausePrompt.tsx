/** WIREFRAME: docs/prd/27_live_substitutions.md §UI — Verletzungs-Prompt und Halbzeit-Karte (Modal). */
import { useEffect, useRef } from "react";
import { ArrowLeftRight, Play, UserCog } from "lucide-react";
import type { MatchPairStats } from "@fussballmanager/shared";
import { useT } from "../i18n/react.ts";
import { PlayerPortrait } from "../ui/components/PlayerPortrait.tsx";
import { LineupFatigueBars } from "./LineupFatigueBars.tsx";
import { fatigueTone, type MatchPortraitLookup } from "./MatchSubstitutionPanel.tsx";
import type { LiveSquadRow } from "./live-substitutions.ts";

function PromptShell({
  titleId,
  kicker,
  title,
  children,
  foot,
}: {
  titleId: string;
  kicker: string;
  title: string;
  children: React.ReactNode;
  foot: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("button")?.focus();
  }, []);
  return (
    <div className="tc-scrim" role="presentation">
      <section ref={ref} className="tc-modal tc-matchprompt" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="tc-modal__head">
          <div>
            <p className="tc-label">{kicker}</p>
            <h2 className="tc-modal__title" id={titleId}>
              {title}
            </h2>
          </div>
        </header>
        <div className="tc-modal__body">{children}</div>
        <footer className="tc-modal__foot">{foot}</footer>
      </section>
    </div>
  );
}

function PortraitFor({ id, portraitFor }: { id: string; portraitFor?: MatchPortraitLookup }) {
  const portrait = portraitFor?.(id);
  return portrait ? (
    <PlayerPortrait seed={portrait.seed} clubId={portrait.clubId} nationality={portrait.nationality} size="sm" />
  ) : (
    <PlayerPortrait seed={0} size="sm" variant="silhouette" />
  );
}

/** An own player is hurt: pick a replacement, let the assistant decide, or play on. */
export function MatchInjuryPrompt({
  minuteLabel,
  injured,
  left,
  suggestions,
  subsLeft,
  portraitFor,
  onSubstitute,
  onAssistant,
  onPlayOn,
}: {
  minuteLabel: string;
  injured: { id: string; name: string };
  /** He could not carry on: without a change the side plays a man down. */
  left: boolean;
  suggestions: readonly LiveSquadRow[];
  subsLeft: number;
  portraitFor?: MatchPortraitLookup;
  onSubstitute: (onId: string) => void;
  onAssistant: () => void;
  onPlayOn: () => void;
}) {
  const t = useT();
  const canChange = subsLeft > 0 && suggestions.length > 0;
  return (
    <PromptShell
      titleId="match-injury-title"
      kicker={`${minuteLabel} · ${t("match.prompt.injury.kicker")}`}
      title={t("match.prompt.injury.title", { name: injured.name })}
      foot={
        <>
          <button type="button" className="tc-btn tc-btn--ghost" onClick={onPlayOn}>
            <Play className="tc-icon" strokeWidth={2.5} aria-hidden />
            {left ? t("match.prompt.injury.playOnShort") : t("match.prompt.injury.playOn")}
          </button>
          {canChange ? (
            <button type="button" className="tc-btn" onClick={onAssistant}>
              <UserCog className="tc-icon" strokeWidth={2.5} aria-hidden />
              {t("match.prompt.injury.assistant")}
            </button>
          ) : null}
        </>
      }
    >
      <div className="tc-matchprompt__who">
        <PortraitFor id={injured.id} portraitFor={portraitFor} />
        <p className={`tc-callout ${left ? "tc-callout--no" : "tc-callout--warn"}`}>
          {left ? t("match.prompt.injury.left") : t("match.prompt.injury.knock")}
        </p>
      </div>
      {canChange ? (
        <>
          <p className="tc-label">{t("match.prompt.injury.suggest", { left: subsLeft })}</p>
          <ul className="tc-matchprompt__picks">
            {suggestions.map((row) => (
              <li key={row.id}>
                <button type="button" className="tc-matchprompt__pick" onClick={() => onSubstitute(row.id)}>
                  <PortraitFor id={row.id} portraitFor={portraitFor} />
                  <span className="tc-subs__id">
                    <span className="tc-subs__name">{row.name}</span>
                    <span className="tc-subs__meta">
                      {row.role} · #{row.shirt}
                    </span>
                  </span>
                  <ArrowLeftRight className="tc-icon" strokeWidth={2.5} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="tc-callout tc-callout--warn">{t("match.subs.noneLeft")}</p>
      )}
    </PromptShell>
  );
}

/** Half-time: score, the main numbers, who is tired, and the way into the change panel. */
export function MatchHalfTimePrompt({
  score,
  stats,
  ownSide,
  tired,
  subsLeft,
  portraitFor,
  onOpenSubs,
  onResume,
}: {
  score: string;
  stats: MatchPairStats;
  ownSide: "home" | "away";
  tired: readonly LiveSquadRow[];
  subsLeft: number;
  portraitFor?: MatchPortraitLookup;
  onOpenSubs: () => void;
  onResume: () => void;
}) {
  const t = useT();
  const own = stats[ownSide];
  const other = stats[ownSide === "home" ? "away" : "home"];
  return (
    <PromptShell
      titleId="match-halftime-title"
      kicker={t("match.prompt.halftime.kicker")}
      title={score}
      foot={
        <>
          {subsLeft > 0 ? (
            <button type="button" className="tc-btn" onClick={onOpenSubs}>
              <ArrowLeftRight className="tc-icon" strokeWidth={2.5} aria-hidden />
              {t("match.prompt.halftime.subs", { left: subsLeft })}
            </button>
          ) : null}
          <button type="button" className="tc-btn tc-btn--primary" onClick={onResume}>
            <Play className="tc-icon" strokeWidth={2.5} aria-hidden />
            {t("match.prompt.halftime.resume")}
          </button>
        </>
      }
    >
      <dl className="tc-kv">
        <dt>{t("match.stats.shots")}</dt>
        <dd>
          {own.shots} : {other.shots}
        </dd>
        <dt>{t("match.stats.shotsOnTarget")}</dt>
        <dd>
          {own.shotsOnTarget} : {other.shotsOnTarget}
        </dd>
        <dt>{t("match.stats.corners")}</dt>
        <dd>
          {own.corners} : {other.corners}
        </dd>
      </dl>
      <div>
        <p className="tc-label">{t("match.prompt.halftime.tired")}</p>
        {tired.length === 0 ? (
          <p className="tc-caption">{t("match.prompt.halftime.allFresh")}</p>
        ) : (
          <ul className="tc-matchprompt__tired">
            {tired.map((row) => (
              <li key={row.id} className="tc-subs__row">
                <PortraitFor id={row.id} portraitFor={portraitFor} />
                <span className="tc-subs__id">
                  <span className="tc-subs__name">{row.name}</span>
                  <span className="tc-subs__meta">{row.role}</span>
                </span>
                <span className={`tc-subs__fit tc-state--${fatigueTone(row.fatigue)}`}>
                  <LineupFatigueBars fitness={100 - (row.fatigue ?? 0)} compact />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PromptShell>
  );
}
