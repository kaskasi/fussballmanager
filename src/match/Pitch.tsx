import { memo, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { GOAL_HIGHLIGHT_MS } from "./goal-highlight.ts";
import { useT } from "../i18n/react.ts";
import type {
  MatchViewCueDetail,
  MatchViewFrame,
  MatchViewRosterPlayer,
  MatchViewSide,
} from "@fussballmanager/shared";
import { PitchMomentIcon } from "./PitchMomentIcon.tsx";
import { MatchSubstitutionTicker } from "./MatchSubstitutionTicker";
import { mixFrame, type DisplayedPose } from "./lerp";

const PITCH_W = 105;
const PITCH_H = 68;

function mapX(x: number): number {
  return (x / 100) * PITCH_W;
}

function mapY(y: number): number {
  return (y / 100) * PITCH_H;
}

function paint(svg: SVGSVGElement, pose: DisplayedPose): void {
  for (const dot of pose.dots) {
    const group = svg.querySelector(`[data-player="${dot.playerId}"]`);
    if (!(group instanceof SVGGElement)) {
      continue;
    }
    const cx = String(mapX(dot.x));
    const cy = String(mapY(dot.y));
    for (const circle of group.querySelectorAll("circle")) {
      circle.setAttribute("cx", cx);
      circle.setAttribute("cy", cy);
    }
    const text = group.querySelector("text");
    text?.setAttribute("x", cx);
    text?.setAttribute("y", cy);
  }
  const grassX = String(mapX(pose.ball.x));
  const grassY = mapY(pose.ball.y);
  const shadow = svg.querySelector("[data-ball-shadow]");
  const ball = svg.querySelector("[data-ball]");
  if (shadow instanceof SVGEllipseElement) {
    const airborne = pose.ballLift > 0.12;
    shadow.setAttribute("cx", grassX);
    shadow.setAttribute("cy", String(grassY));
    shadow.setAttribute("rx", String(airborne ? 0.85 : 1.2 + pose.ballLift * 0.35));
    shadow.setAttribute("ry", String(airborne ? 0.35 : 0.55 + pose.ballLift * 0.15));
    shadow.setAttribute(
      "opacity",
      String(airborne ? 0.12 + 0.18 * (1 - pose.ballLift) : 0.18 + 0.28 * pose.ballLift),
    );
  }
  if (ball instanceof SVGCircleElement) {
    ball.setAttribute("cx", grassX);
    ball.setAttribute("cy", String(grassY - pose.ballLift * 2.8));
    ball.setAttribute("r", "0.95");
  }
}

type PitchProps = {
  from: MatchViewFrame;
  to: MatchViewFrame;
  playing: boolean;
  durationMs: number;
  homeId: string;
  home: MatchViewSide;
  away: MatchViewSide;
  roster: readonly MatchViewRosterPlayer[];
  cue: MatchViewFrame["cue"];
  cueDetail?: MatchViewCueDetail;
  /** Own club: ink chips; the opponent gets outlined panel chips. Defaults to home. */
  ownTeamId?: string;
  /** Ball contacts up to the current frame — shown in the player card. */
  ballContacts?: (playerId: string) => number;
};

function paintPose(svg: SVGSVGElement, pose: DisplayedPose): void {
  paint(svg, pose);
}

export const Pitch = memo(function Pitch({
  from,
  to,
  playing,
  durationMs,
  homeId,
  home,
  away,
  roster,
  cue,
  cueDetail,
  ownTeamId,
  ballContacts,
}: PitchProps) {
  const t = useT();
  const svgRef = useRef<SVGSVGElement>(null);
  const displayedPoseRef = useRef<DisplayedPose | null>(null);
  const [goalHighlightSeq, setGoalHighlightSeq] = useState<number | null>(null);
  const [goalScorerId, setGoalScorerId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const shirts = new Map(roster.map((player) => [player.id, player]));
  const ownId = ownTeamId ?? homeId;

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  const toggleSelected = (playerId: string) =>
    setSelectedId((current) => (current === playerId ? null : playerId));
  const onChipKey = (event: KeyboardEvent<SVGGElement>, playerId: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    // Space must not also reach the matchday play/pause shortcut on window.
    event.stopPropagation();
    toggleSelected(playerId);
  };

  useEffect(() => {
    if (to.cue !== "goal") {
      return;
    }
    const scorerId =
      to.ballCarrierId ??
      roster.find((player) => player.name === cueDetail?.label)?.id ??
      null;
    setGoalHighlightSeq(to.seq);
    setGoalScorerId(scorerId);
    const clear = window.setTimeout(() => {
      setGoalHighlightSeq(null);
      setGoalScorerId(null);
    }, GOAL_HIGHLIGHT_MS);
    return () => window.clearTimeout(clear);
  }, [cueDetail?.label, roster, to.ballCarrierId, to.cue, to.seq]);
  const roleOf = (playerId: string) => shirts.get(playerId)?.role;
  const poseAt = (t: number) => mixFrame(from, to, t, homeId, roleOf);
  const settledPose = poseAt(1);
  if (!displayedPoseRef.current) {
    displayedPoseRef.current = settledPose;
  }
  const renderPose =
    !playing || durationMs <= 0 ? settledPose : displayedPoseRef.current;

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }
    const commitPose = (pose: DisplayedPose) => {
      displayedPoseRef.current = pose;
      paintPose(svg, pose);
    };
    if (!playing || durationMs <= 0) {
      commitPose(settledPose);
      return;
    }
    let cancelled = false;
    const begun = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      if (cancelled) {
        return;
      }
      const t = Math.min(1, (now - begun) / durationMs);
      commitPose(poseAt(t));
      if (t < 1) {
        raf = window.requestAnimationFrame(tick);
      }
    };
    commitPose(poseAt(0));
    raf = window.requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
  }, [from, to, playing, durationMs, homeId, roster]);

  const highlightActive = goalHighlightSeq === to.seq && to.cue === "goal";
  const selected = selectedId ? shirts.get(selectedId) : undefined;
  const selectedTeam = selected ? (selected.teamId === home.id ? home : away) : undefined;

  return (
    <figure
      className={[
        "pitch-wrap",
        "tc-pitch",
        highlightActive ? "pitch-wrap--goal-highlight" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <PitchMomentIcon cue={cue} cueDetail={cueDetail} seq={to.seq} />
      <MatchSubstitutionTicker cue={cue} cueDetail={cueDetail} seq={to.seq} />
      {selected && selectedTeam ? (
        <div className="tc-pitch__card" role="dialog" aria-label={selected.name}>
          <div className="tc-pitch__card-head">
            <span className="tc-pitch__card-shirt">{selected.shirt}</span>
            <strong className="tc-pitch__card-name">{selected.name}</strong>
            <button
              type="button"
              className="tc-iconbtn tc-pitch__card-close"
              onClick={() => setSelectedId(null)}
              aria-label={t("match.pitch.closeCard")}
            >
              <X className="tc-icon" strokeWidth={2.5} aria-hidden />
            </button>
          </div>
          <p className="tc-caption tc-pitch__card-meta">
            {selectedTeam.shortName} · {selected.role}
          </p>
          {ballContacts ? (
            <dl className="tc-kv">
              <dt>{t("match.pitch.ballContacts")}</dt>
              <dd>{ballContacts(selected.id)}</dd>
            </dl>
          ) : null}
        </div>
      ) : null}
      <svg
        ref={svgRef}
        className="pitch"
        viewBox={`-3 -3 ${PITCH_W + 6} ${PITCH_H + 6}`}
        role="group"
        aria-label={t("match.pitch.aria", {
          home: home.shortName,
          away: away.shortName,
          score: `${to.score.home}–${to.score.away}`,
        })}
      >
        <rect className="tc-pitch__surround" x={-3} y={-3} width={PITCH_W + 6} height={PITCH_H + 6} rx={1.2} />
        <rect className="tc-pitch__grass" x={0} y={0} width={PITCH_W} height={PITCH_H} strokeWidth={0.45} />
        <g className="tc-pitch__lines" fill="none" strokeWidth={0.3}>
          <line x1={PITCH_W / 2} y1={0} x2={PITCH_W / 2} y2={PITCH_H} />
          <circle cx={PITCH_W / 2} cy={PITCH_H / 2} r={9.15} />
          <rect x={0} y={13.84} width={16.5} height={40.32} />
          <rect x={PITCH_W - 16.5} y={13.84} width={16.5} height={40.32} />
          <rect x={0} y={24.84} width={5.5} height={18.32} />
          <rect x={PITCH_W - 5.5} y={24.84} width={5.5} height={18.32} />
        </g>
        <circle className="tc-pitch__spot" cx={PITCH_W / 2} cy={PITCH_H / 2} r={0.5} />
        {renderPose.dots.map((dot) => {
          const own = dot.teamId === ownId;
          const carrier = dot.playerId === to.ballCarrierId;
          const player = shirts.get(dot.playerId);
          const cx = mapX(dot.x);
          const cy = mapY(dot.y);
          return (
            <g
              key={dot.playerId}
              data-player={dot.playerId}
              className={[
                "tc-pitch__player",
                own ? "is-own" : "is-other",
                carrier ? "is-carrier" : "",
                selectedId === dot.playerId ? "is-selected" : "",
                highlightActive && goalScorerId === dot.playerId ? "pitch-player--goal-scorer" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              role="button"
              tabIndex={0}
              aria-pressed={selectedId === dot.playerId}
              aria-label={player ? `${player.shirt} ${player.name}` : dot.playerId}
              onClick={() => toggleSelected(dot.playerId)}
              onKeyDown={(event) => onChipKey(event, dot.playerId)}
            >
              {selectedId === dot.playerId ? (
                <circle className="tc-pitch__halo" cx={cx} cy={cy} r={2.7} />
              ) : null}
              <circle className="tc-pitch__chip" cx={cx} cy={cy} r={carrier ? 1.85 : 1.55} />
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={player && player.shirt >= 10 ? 1.35 : 1.5}
                fontWeight={700}
              >
                {player?.shirt ?? ""}
              </text>
            </g>
          );
        })}
        <ellipse
          className="tc-pitch__shadow"
          data-ball-shadow
          cx={mapX(renderPose.ball.x)}
          cy={mapY(renderPose.ball.y)}
          rx={1.2 + renderPose.ballLift * 0.35}
          ry={0.55 + renderPose.ballLift * 0.15}
          opacity={0.18 + 0.28 * renderPose.ballLift}
        />
        <circle
          className="tc-pitch__ball"
          data-ball
          cx={mapX(renderPose.ball.x)}
          cy={mapY(renderPose.ball.y) - renderPose.ballLift * 2.8}
          r={0.95}
          strokeWidth={0.2}
        />
      </svg>
    </figure>
  );
});
