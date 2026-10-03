import type { MatchPairStats, MatchSideStats, MatchView } from "@fussballmanager/shared";
import { passCompletionPct } from "@fussballmanager/shared";

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
  label: string;
  home: string;
  away: string;
  homeBar: number;
  awayBar: number;
};

function rows(stats: MatchPairStats): Row[] {
  return [
    {
      id: "goals",
      label: "Tore",
      home: String(stats.home.goals),
      away: String(stats.away.goals),
      homeBar: stats.home.goals,
      awayBar: stats.away.goals,
    },
    {
      id: "shots",
      label: "Schüsse",
      home: String(stats.home.shots),
      away: String(stats.away.shots),
      homeBar: stats.home.shots,
      awayBar: stats.away.shots,
    },
    {
      id: "sot",
      label: "auf Tor",
      home: String(stats.home.shotsOnTarget),
      away: String(stats.away.shotsOnTarget),
      homeBar: stats.home.shotsOnTarget,
      awayBar: stats.away.shotsOnTarget,
    },
    {
      id: "corners",
      label: "Ecken",
      home: String(stats.home.corners),
      away: String(stats.away.corners),
      homeBar: stats.home.corners,
      awayBar: stats.away.corners,
    },
    {
      id: "pass",
      label: "Pässe %",
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
  return (
    <section
      className={compact ? "match-stats match-stats--compact" : "match-stats"}
      aria-label="Match statistics"
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
              <span className="stat-label">{row.label}</span>
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
