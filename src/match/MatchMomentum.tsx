/** design.md §9.15 — live momentum: per-minute diverging bars, own club above (accent), opponent below (info). */
import { useMemo } from "react";
import type { MatchView } from "@fussballmanager/shared";
import { useT } from "../i18n/react.ts";
import { momentumSeries, recentMomentumShare } from "./match-momentum.ts";

const UNIT = 4;
const BAR = 3;
const HEIGHT = 56;
const MID = HEIGHT / 2;
const HALF = MID - 2;
/** Floor for the scale so a quiet opening does not look like a siege. */
const MIN_SCALE = 3;

export function MatchMomentum({
  view,
  frameIndex,
  ownTeamId,
}: {
  view: MatchView;
  frameIndex: number;
  ownTeamId: string;
}) {
  const t = useT();
  const series = useMemo(
    () => momentumSeries(view.frames, view.home.id, frameIndex),
    [view.frames, view.home.id, frameIndex],
  );
  const homeIsOwn = ownTeamId === view.home.id;
  const own = homeIsOwn ? view.home : view.away;
  const other = homeIsOwn ? view.away : view.home;
  const width = Math.max(series.totalBuckets, 90) * UNIT;
  const scale = Math.max(
    MIN_SCALE,
    ...series.buckets.map((bucket) => Math.max(bucket.home, bucket.away)),
  );
  const homeShare = recentMomentumShare(series.buckets);
  const ownPct = homeShare === null ? null : Math.round(100 * (homeIsOwn ? homeShare : 1 - homeShare));
  const label =
    ownPct === null
      ? t("match.momentum.ariaQuiet")
      : t("match.momentum.aria", {
          own: own.shortName,
          other: other.shortName,
          ownPct: String(ownPct),
          otherPct: String(100 - ownPct),
        });

  return (
    <section className="tc-momentum" aria-label={t("match.momentum.title")}>
      <div className="tc-momentum__head">
        <p className="tc-label">{t("match.momentum.title")}</p>
        <ul className="tc-momentum__legend">
          <li>
            <span className="tc-momentum__swatch is-own" aria-hidden="true" />
            {own.shortName}
          </li>
          <li>
            <span className="tc-momentum__swatch is-other" aria-hidden="true" />
            {other.shortName}
          </li>
        </ul>
      </div>
      <svg
        className="tc-momentum__chart"
        viewBox={`0 0 ${width} ${HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={label}
      >
        <line className="tc-momentum__axis" x1={0} x2={width} y1={MID} y2={MID} vectorEffect="non-scaling-stroke" />
        {series.secondHalfStart !== null ? (
          <line
            className="tc-momentum__half"
            x1={series.secondHalfStart * UNIT - 0.5}
            x2={series.secondHalfStart * UNIT - 0.5}
            y1={0}
            y2={HEIGHT}
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        {series.buckets.map((bucket, index) => {
          const ownValue = homeIsOwn ? bucket.home : bucket.away;
          const otherValue = homeIsOwn ? bucket.away : bucket.home;
          const ownH = (HALF * ownValue) / scale;
          const otherH = (HALF * otherValue) / scale;
          const total = ownValue + otherValue;
          const pct = total > 0 ? Math.round((100 * ownValue) / total) : 50;
          return (
            <g key={index}>
              <title>
                {t("match.momentum.minute", {
                  minute: bucket.label,
                  own: own.shortName,
                  other: other.shortName,
                  ownPct: String(pct),
                  otherPct: String(100 - pct),
                })}
              </title>
              <rect className="tc-momentum__hit" x={index * UNIT} y={0} width={UNIT} height={HEIGHT} />
              {ownH > 0.2 ? (
                <rect className="tc-momentum__bar is-own" x={index * UNIT} y={MID - 1 - ownH} width={BAR} height={ownH} />
              ) : null}
              {otherH > 0.2 ? (
                <rect className="tc-momentum__bar is-other" x={index * UNIT} y={MID + 1} width={BAR} height={otherH} />
              ) : null}
            </g>
          );
        })}
      </svg>
    </section>
  );
}
