import type { MatchPairStats, MatchSideStats, MatchView } from "@fussballmanager/shared";
import { passCompletionPct } from "@fussballmanager/shared";
import { useT } from "../i18n/react.ts";

function pctLabel(side: MatchSideStats): string {
  const pct = passCompletionPct(side);
  return pct === null ? "—" : `${pct}%`;
}

function barWidth(value: number, other: number): string {
  const total = value + other;
  if (total <= 0) {
    return "0%";
  }
  return `${Math.round((100 * value) / total)}%`;
}

type Row = {
  id: string;
  labelKey: string;
  home: string;
  away: string;
  homeBar: number;
  awayBar: number;
};

function rows(stats: MatchPairStats): Row[] {
  return [
    {
      id: "goals",
      labelKey: "match.stats.goals",
      home: String(stats.home.goals),
      away: String(stats.away.goals),
      homeBar: stats.home.goals,
      awayBar: stats.away.goals,
    },
    {
      id: "shots",
      labelKey: "match.stats.shots",
      home: String(stats.home.shots),
      away: String(stats.away.shots),
      homeBar: stats.home.shots,
      awayBar: stats.away.shots,
    },
    {
      id: "sot",
      labelKey: "match.stats.shotsOnTarget",
      home: String(stats.home.shotsOnTarget),
      away: String(stats.away.shotsOnTarget),
      homeBar: stats.home.shotsOnTarget,
      awayBar: stats.away.shotsOnTarget,
    },
    {
      id: "corners",
      labelKey: "match.stats.corners",
      home: String(stats.home.corners),
      away: String(stats.away.corners),
      homeBar: stats.home.corners,
      awayBar: stats.away.corners,
    },
    {
      id: "pass",
      labelKey: "match.stats.passPct",
      home: pctLabel(stats.home),
      away: pctLabel(stats.away),
      homeBar: passCompletionPct(stats.home) ?? 0,
      awayBar: passCompletionPct(stats.away) ?? 0,
    },
  ];
}

type MatchStatsProps = {
  view: MatchView;
  stats: MatchPairStats;
  compact?: boolean;
};

export function MatchStats({ view, stats, compact = false }: MatchStatsProps) {
  const t = useT();

  return (
    <section
      className={compact ? "match-stats match-stats--compact" : "match-stats"}
      aria-label={t("match.stats.aria")}
    >
      <div className="stat-teams">
        <span>{view.home.shortName}</span>
        <span>{view.away.shortName}</span>
      </div>
      <ul>
        {rows(stats).map((row) => (
          <li key={row.id}>
            <span className="stat-home">{row.home}</span>
            <div className="stat-mid">
              <span className="stat-label">{t(row.labelKey)}</span>
              <div className="stat-track" aria-hidden="true">
                <span
                  className="stat-fill home"
                  style={{ width: barWidth(row.homeBar, row.awayBar) }}
                />
                <span
                  className="stat-fill away"
                  style={{ width: barWidth(row.awayBar, row.homeBar) }}
                />
              </div>
            </div>
            <span className="stat-away">{row.away}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
