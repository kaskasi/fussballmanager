/** design.md §9.15 — live commentary as the matchday hero: minute column, analyst badge, icons instead of emoji. */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUpFromLine,
  CircleDot,
  Crosshair,
  Flag,
  FlagTriangleRight,
  Footprints,
  Goal,
  Hand,
  HeartPulse,
  Timer,
} from "lucide-react";
import type { MatchViewLine } from "@fussballmanager/shared";
import { useT } from "../i18n/react.ts";
import { localizeMatchLine } from "./localize-match-line.ts";
import { lineTone, stripClockPrefix } from "./text-playback.ts";

/** Distance from the bottom (px) that still counts as "following the stream". */
const FOLLOW_SLACK_PX = 32;

const BEAT_ICONS: Record<string, ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>> = {
  shot_goal: Goal,
  shot_taken: Crosshair,
  shot_saved: Crosshair,
  shot_wide: Crosshair,
  shot_woodwork: Crosshair,
  shot_blocked: Crosshair,
  substitution: ArrowLeftRight,
  injury: HeartPulse,
  match_opening: Timer,
  second_half_open: Timer,
  half_time: Timer,
  full_time: Timer,
  // Set-piece moments: line icons, not the German-text pitch banners of moment-cue-icons.ts.
  restart_corner: Flag,
  restart_throw_in: Hand,
  restart_free_kick: Footprints,
  restart_goal_kick: ArrowUpFromLine,
  restart_penalty: CircleDot,
  offside: FlagTriangleRight,
};

function LineMarker({ line }: { line: MatchViewLine }) {
  if (line.voice === "color") return null;
  if (line.beatId === "card_yellow" || line.beatId === "card_red") {
    const color = line.beatId === "card_red" ? "red" : "yellow";
    return <span className={`tc-eventlog__card tc-eventlog__card--${color}`} aria-hidden="true" />;
  }
  const Icon = line.beatId ? BEAT_ICONS[line.beatId] : undefined;
  return Icon ? <Icon className="tc-icon" strokeWidth={2.25} aria-hidden /> : null;
}

export function MatchCommentaryStream({
  lines,
  minuteOf,
}: {
  lines: readonly MatchViewLine[];
  /** Minute column label for a line ("67'"), from the frame it belongs to. */
  minuteOf: (line: MatchViewLine) => string;
}) {
  const t = useT();
  const listRef = useRef<HTMLOListElement>(null);
  const followRef = useRef(true);
  const [following, setFollowing] = useState(true);

  const onScroll = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight <= FOLLOW_SLACK_PX;
    followRef.current = atBottom;
    setFollowing(atBottom);
  }, []);

  const jumpToLatest = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    followRef.current = true;
    setFollowing(true);
    list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, []);

  const latest = lines.at(-1);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !followRef.current) return;
    list.scrollTop = list.scrollHeight;
  }, [lines.length, latest]);

  // Stepping back shortens the stream; follow it again so the newest line stays in view.
  useEffect(() => {
    if (lines.length <= 1) {
      followRef.current = true;
      setFollowing(true);
    }
  }, [lines.length]);

  return (
    <section className="tc-panel tc-stream" aria-label={t("match.commentary.label")}>
      <ol
        ref={listRef}
        className="tc-stream__list"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        onScroll={onScroll}
      >
        {lines.length === 0 ? (
          <li className="tc-stream__line is-latest">
            <span className="tc-stream__minute" />
            <span className="tc-stream__marker" />
            <span className="tc-stream__text">{t("match.commentary.kickoff")}</span>
          </li>
        ) : (
          lines.map((line, index) => {
            const tone = lineTone(line);
            const color = line.voice === "color";
            return (
              <li
                key={`${line.seq}-${line.voice ?? "pbp"}-${index}`}
                className={[
                  "tc-stream__line",
                  color ? "is-color" : "",
                  line.voice === "moment" ? "is-moment" : "",
                  tone !== "default" ? `is-${tone}` : "",
                  index === lines.length - 1 ? "is-latest" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="tc-stream__minute">{minuteOf(line)}</span>
                <span className="tc-stream__marker">
                  <LineMarker line={line} />
                </span>
                <span className="tc-stream__text">
                  {color ? <span className="tc-match__badge">{t("match.commentary.expert")}</span> : null}
                  {stripClockPrefix(localizeMatchLine(line))}
                </span>
              </li>
            );
          })
        )}
      </ol>
      {!following ? (
        <button type="button" className="tc-chip tc-chip--dense tc-chip--icon tc-stream__jump" onClick={jumpToLatest}>
          <ArrowDown className="tc-icon" strokeWidth={2.5} aria-hidden />
          {t("match.commentary.jumpLatest")}
        </button>
      ) : null}
    </section>
  );
}
