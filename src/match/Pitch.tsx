import { useLayoutEffect, useRef } from "react";
import type {
  MatchViewFrame,
  MatchViewRosterPlayer,
  MatchViewSide,
} from "@fussballmanager/shared";
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
    const circle = group.querySelector("circle");
    const text = group.querySelector("text");
    circle?.setAttribute("cx", cx);
    circle?.setAttribute("cy", cy);
    text?.setAttribute("x", cx);
    text?.setAttribute("y", cy);
  }
  const grassX = String(mapX(pose.ball.x));
  const grassY = mapY(pose.ball.y);
  const shadow = svg.querySelector("[data-ball-shadow]");
  const ball = svg.querySelector("[data-ball]");
  if (shadow instanceof SVGEllipseElement) {
    shadow.setAttribute("cx", grassX);
    shadow.setAttribute("cy", String(grassY));
    shadow.setAttribute("rx", String(1.35 + pose.ballLift * 0.25));
    shadow.setAttribute("ry", String(0.7 + pose.ballLift * 0.12));
    shadow.setAttribute("opacity", String(0.12 + 0.38 * pose.ballLift));
  }
  if (ball instanceof SVGCircleElement) {
    ball.setAttribute("cx", grassX);
    ball.setAttribute("cy", String(grassY));
    ball.setAttribute("r", String(0.85 + pose.ballLift * 0.35));
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
};

export function Pitch({
  from,
  to,
  playing,
  durationMs,
  homeId,
  home,
  away,
  roster,
}: PitchProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const shirts = new Map(roster.map((player) => [player.id, player]));
  const start = mixFrame(from, to, playing ? 0 : 1);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }
    if (!playing || durationMs <= 0) {
      paint(svg, mixFrame(from, to, 1));
      return;
    }
    const begun = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - begun) / durationMs);
      paint(svg, mixFrame(from, to, t));
      if (t < 1) {
        raf = window.requestAnimationFrame(tick);
      }
    };
    paint(svg, mixFrame(from, to, 0));
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [from, to, playing, durationMs]);

  return (
    <figure className="pitch-wrap">
      <svg
        ref={svgRef}
        className="pitch"
        viewBox={`-3 -3 ${PITCH_W + 6} ${PITCH_H + 6}`}
        role="img"
        aria-label={`Pitch, ${home.shortName} ${to.score.home}–${to.score.away} ${away.shortName}`}
      >
        <rect
          x={-3}
          y={-3}
          width={PITCH_W + 6}
          height={PITCH_H + 6}
          rx={1.2}
          fill="#166534"
        />
        <rect
          x={0}
          y={0}
          width={PITCH_W}
          height={PITCH_H}
          fill="#15803d"
          stroke="#ecfdf5"
          strokeWidth={0.45}
        />
        <line
          x1={PITCH_W / 2}
          y1={0}
          x2={PITCH_W / 2}
          y2={PITCH_H}
          stroke="#ecfdf5"
          strokeWidth={0.3}
        />
        <circle
          cx={PITCH_W / 2}
          cy={PITCH_H / 2}
          r={9.15}
          fill="none"
          stroke="#ecfdf5"
          strokeWidth={0.3}
        />
        <circle
          cx={PITCH_W / 2}
          cy={PITCH_H / 2}
          r={0.5}
          fill="#ecfdf5"
        />
        <rect
          x={0}
          y={13.84}
          width={16.5}
          height={40.32}
          fill="none"
          stroke="#ecfdf5"
          strokeWidth={0.3}
        />
        <rect
          x={PITCH_W - 16.5}
          y={13.84}
          width={16.5}
          height={40.32}
          fill="none"
          stroke="#ecfdf5"
          strokeWidth={0.3}
        />
        <rect
          x={0}
          y={24.84}
          width={5.5}
          height={18.32}
          fill="none"
          stroke="#ecfdf5"
          strokeWidth={0.3}
        />
        <rect
          x={PITCH_W - 5.5}
          y={24.84}
          width={5.5}
          height={18.32}
          fill="none"
          stroke="#ecfdf5"
          strokeWidth={0.3}
        />
        {start.dots.map((dot) => {
          const homeDot = dot.teamId === homeId;
          const carrier = dot.playerId === to.ballCarrierId;
          const player = shirts.get(dot.playerId);
          const cx = mapX(dot.x);
          const cy = mapY(dot.y);
          return (
            <g key={dot.playerId} data-player={dot.playerId}>
              <title>
                {player
                  ? `${player.shirt} ${player.name}`
                  : dot.playerId}
              </title>
              <circle
                cx={cx}
                cy={cy}
                r={carrier ? 1.85 : 1.55}
                fill={homeDot ? "#fbbf24" : "#e0f2fe"}
                stroke={carrier ? "#0f172a" : "#14532d"}
                strokeWidth={carrier ? 0.45 : 0.22}
              />
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={player && player.shirt >= 10 ? 1.35 : 1.5}
                fontWeight={700}
                fill="#0f172a"
                style={{ pointerEvents: "none" }}
              >
                {player?.shirt ?? ""}
              </text>
            </g>
          );
        })}
        <ellipse
          data-ball-shadow
          cx={mapX(start.ball.x)}
          cy={mapY(start.ball.y)}
          rx={1.35 + start.ballLift * 0.25}
          ry={0.7 + start.ballLift * 0.12}
          fill="#052e16"
          opacity={0.12 + 0.38 * start.ballLift}
        />
        <circle
          data-ball
          cx={mapX(start.ball.x)}
          cy={mapY(start.ball.y)}
          r={0.85 + start.ballLift * 0.35}
          fill="#fff"
          stroke="#0f172a"
          strokeWidth={0.2}
        />
      </svg>
    </figure>
  );
}
