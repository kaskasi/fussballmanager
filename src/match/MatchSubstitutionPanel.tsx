/** WIREFRAME: docs/prd/27_live_substitutions.md §UI — Wechsel-Tab der Live-Regeln (nur in der Pause). */
import { useEffect, useState } from "react";
import { ArrowLeftRight, Pause } from "lucide-react";
import { useT } from "../i18n/react.ts";
import { PlayerPortrait } from "../ui/components/PlayerPortrait.tsx";
import { LineupFatigueBars } from "./LineupFatigueBars.tsx";
import type { LiveSquadRow, LiveSubstitutionState } from "./live-substitutions.ts";

/** Portrait inputs for a match player id (career players only; template fillers get none). */
export type MatchPortraitLookup = (
  playerId: string,
) => { seed: number; clubId?: string | null; nationality?: string } | undefined;

/** Fatigue at which the panel flags a player as tired / spent. */
const TIRED_AT = 60;
const SPENT_AT = 78;

export function fatigueTone(fatigue: number | undefined): "good" | "mid" | "low" {
  if (fatigue === undefined || fatigue < TIRED_AT) return "good";
  return fatigue < SPENT_AT ? "mid" : "low";
}

export function MatchSubstitutionPanel({
  state,
  paused,
  busy,
  portraitFor,
  onPause,
  onSubstitute,
}: {
  state: LiveSubstitutionState;
  paused: boolean;
  busy: boolean;
  portraitFor?: MatchPortraitLookup;
  onPause: () => void;
  onSubstitute: (offId: string, onId: string) => void;
}) {
  const t = useT();
  const [offId, setOffId] = useState<string | null>(null);
  const [onId, setOnId] = useState<string | null>(null);

  // Drop a pick that is no longer available (the change went through, or the player left).
  useEffect(() => {
    if (offId && !state.onPitch.some((row) => row.id === offId)) setOffId(null);
    if (onId && !state.bench.some((row) => row.id === onId)) setOnId(null);
  }, [state, offId, onId]);

  const canSubmit = paused && !busy && state.left > 0 && offId !== null && onId !== null;

  return (
    <div className="tc-subs">
      <div className="tc-subs__head">
        <span className="tc-label">{t("match.subs.title")}</span>
        <span className={`tc-subs__count${state.left === 0 ? " is-spent" : ""}`}>
          {t("match.subs.count", { used: state.used, max: state.used + state.left })}
        </span>
      </div>

      {!paused ? (
        <div className="tc-callout tc-subs__pause">
          <span>{t("match.subs.pauseFirst")}</span>
          <button type="button" className="tc-chip tc-chip--icon" onClick={onPause}>
            <Pause className="tc-icon" strokeWidth={2.5} aria-hidden />
            {t("match.career.nav.pause")}
          </button>
        </div>
      ) : state.left === 0 ? (
        <p className="tc-callout tc-callout--warn">{t("match.subs.noneLeft")}</p>
      ) : null}

      {state.planned.length > 0 ? (
        <ul className="tc-subs__planned" aria-label={t("match.subs.plannedAria")}>
          {state.planned.map((change) => (
            <li key={`${change.offId}-${change.onId}`} className="tc-caption">
              <ArrowLeftRight className="tc-icon" strokeWidth={2.5} aria-hidden />
              {t("match.subs.planned", { on: change.onName, off: change.offName })}
            </li>
          ))}
        </ul>
      ) : null}

      <fieldset className="tc-subs__group" disabled={!paused || busy || state.left === 0}>
        <legend className="tc-label">{t("match.subs.off")}</legend>
        {state.onPitch.map((row) => (
          <SubRow
            key={row.id}
            row={row}
            name="sub-off"
            checked={offId === row.id}
            onPick={() => setOffId(row.id)}
            portraitFor={portraitFor}
          />
        ))}
      </fieldset>

      <fieldset className="tc-subs__group" disabled={!paused || busy || state.left === 0}>
        <legend className="tc-label">{t("match.subs.on")}</legend>
        {state.bench.length === 0 ? <p className="tc-empty">{t("match.subs.benchEmpty")}</p> : null}
        {state.bench.map((row) => (
          <SubRow
            key={row.id}
            row={row}
            name="sub-on"
            checked={onId === row.id}
            onPick={() => setOnId(row.id)}
            portraitFor={portraitFor}
          />
        ))}
      </fieldset>

      <button
        type="button"
        className="tc-btn tc-btn--primary tc-subs__submit"
        disabled={!canSubmit}
        onClick={() => {
          if (!offId || !onId) return;
          onSubstitute(offId, onId);
          setOffId(null);
          setOnId(null);
        }}
      >
        <ArrowLeftRight className="tc-icon" strokeWidth={2.5} aria-hidden />
        {busy ? t("match.subs.busy") : t("match.subs.confirm")}
      </button>
      <p className="tc-caption">{t("match.subs.deadBallHint")}</p>
    </div>
  );
}

function SubRow({
  row,
  name,
  checked,
  onPick,
  portraitFor,
}: {
  row: LiveSquadRow;
  name: string;
  checked: boolean;
  onPick: () => void;
  portraitFor?: MatchPortraitLookup;
}) {
  const t = useT();
  const portrait = portraitFor?.(row.id);
  const tone = fatigueTone(row.fatigue);
  return (
    <label className={`tc-subs__row${checked ? " is-picked" : ""}`}>
      <input type="radio" name={name} className="tc-sr" checked={checked} onChange={onPick} />
      {portrait ? (
        <PlayerPortrait seed={portrait.seed} clubId={portrait.clubId} nationality={portrait.nationality} size="sm" />
      ) : (
        <PlayerPortrait seed={0} size="sm" variant="silhouette" />
      )}
      <span className="tc-subs__id">
        <span className="tc-subs__name">{row.name}</span>
        <span className="tc-subs__meta">
          {row.role} · #{row.shirt}
        </span>
      </span>
      {row.fatigue !== undefined ? (
        <span
          className={`tc-subs__fit tc-state--${tone}`}
          title={t("match.subs.energyTitle", { value: 100 - row.fatigue })}
        >
          <LineupFatigueBars fitness={100 - row.fatigue} compact />
          {tone !== "good" ? <span className="tc-subs__tired">{t(`match.subs.tone.${tone}`)}</span> : null}
        </span>
      ) : null}
    </label>
  );
}
