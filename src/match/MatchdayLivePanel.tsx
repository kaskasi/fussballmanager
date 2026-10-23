/** WIREFRAME: docs/prd/design.md §9.15 — Live-Regeln (rechte Spalte): Transport + Tempo, Tabs Ereignisse | Statistik | Aufstellungen */
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { MatchView, MatchViewFrame } from "@fussballmanager/shared";
import { useT } from "../i18n/react.ts";
import { MatchEventLog } from "./MatchEventLog.tsx";
import { MatchStats } from "./MatchStats.tsx";
import { liveMatchLog } from "./live-match-log.ts";
import { CAREER_MATCH_SPEED_OPTIONS } from "./match-playback-speed.ts";
import { normalizeMatchView } from "./normalize-match-view.ts";
import { MATCH_HIGHLIGHT_LEVELS, type MatchHighlightLevel } from "./match-highlight-level.ts";

type SideTab = "events" | "stats" | "lineups";

const TABS: { id: SideTab; labelKey: string }[] = [
  { id: "events", labelKey: "match.sideTab.events" },
  { id: "stats", labelKey: "match.sideTab.stats" },
  { id: "lineups", labelKey: "match.sideTab.lineups" },
];

export function MatchdayLivePanel({
  view,
  frame,
  ownTeamId,
  playing,
  speed,
  onSpeedChange,
  level,
  onLevelChange,
  onPlayPause,
  onStepBack,
  onStepForward,
  stepBackDisabled,
  stepForwardDisabled,
}: {
  view: MatchView;
  frame: MatchViewFrame;
  ownTeamId: string;
  playing: boolean;
  speed: number;
  onSpeedChange: (speed: number) => void;
  level: MatchHighlightLevel;
  onLevelChange: (level: MatchHighlightLevel) => void;
  onPlayPause: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  stepBackDisabled?: boolean;
  stepForwardDisabled?: boolean;
}) {
  const t = useT();
  const [sideTab, setSideTab] = useState<SideTab>("events");
  const [lineupSide, setLineupSide] = useState<"home" | "away">(
    ownTeamId === view.away.id ? "away" : "home",
  );
  const report = useMemo(() => normalizeMatchView(view).report, [view]);
  const log = liveMatchLog(report, view.home.id, frame.clock, frame.score);
  const lineupTeam = lineupSide === "home" ? view.home : view.away;
  const lineupRows = useMemo(
    () =>
      view.roster
        .filter((entry) => entry.teamId === lineupTeam.id && entry.starter)
        .slice()
        .sort((a, b) => a.shirt - b.shirt),
    [view.roster, lineupTeam.id],
  );

  return (
    <aside className="tc-panel tc-match__side" aria-label={t("match.live.sideAria")}>
      <div className="tc-match__transport" role="group" aria-label={t("match.career.debug.transport")}>
        <button
          type="button"
          className="tc-iconbtn"
          onClick={onStepBack}
          disabled={stepBackDisabled}
          aria-label={t("match.career.debug.stepBack")}
        >
          <ChevronLeft className="tc-icon" strokeWidth={2.5} aria-hidden />
        </button>
        <button
          type="button"
          className="tc-iconbtn tc-match__play"
          onClick={onPlayPause}
          aria-label={playing ? t("match.career.nav.pauseSim") : t("match.career.nav.resumeSim")}
        >
          {playing ? (
            <Pause className="tc-icon" strokeWidth={2.5} aria-hidden />
          ) : (
            <Play className="tc-icon" strokeWidth={2.5} aria-hidden />
          )}
        </button>
        <button
          type="button"
          className="tc-iconbtn"
          onClick={onStepForward}
          disabled={stepForwardDisabled}
          aria-label={t("match.career.debug.stepForward")}
        >
          <ChevronRight className="tc-icon" strokeWidth={2.5} aria-hidden />
        </button>
        <div className="tc-match__rate">
          <label className="tc-match__speed">
            <span className="tc-label">{t("match.highlight.label")}</span>
            <select
              className="tc-select tc-match__level"
              value={level}
              onChange={(event) => onLevelChange(event.target.value as MatchHighlightLevel)}
              aria-label={t("match.highlight.aria")}
            >
              {MATCH_HIGHLIGHT_LEVELS.map((option) => (
                <option key={option} value={option}>
                  {t(`match.highlight.${option}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="tc-match__speed">
            <span className="tc-label">{t("match.hero.speedLabel")}</span>
            <select
              className="tc-select"
              value={speed}
              onChange={(event) => onSpeedChange(Number(event.target.value))}
              aria-label={t("match.hero.speedAria")}
            >
              {CAREER_MATCH_SPEED_OPTIONS.map((rate) => (
                <option key={rate} value={rate}>
                  {rate}×
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="tc-tabs" role="tablist" aria-label={t("match.live.sideTabsAria")}>
        {TABS.map(({ id, labelKey }) => (
          <button
            key={id}
            type="button"
            role="tab"
            className="tc-tab"
            aria-selected={sideTab === id}
            onClick={() => setSideTab(id)}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      <div className="tc-match__tabpanel" role="tabpanel">
        {sideTab === "events" ? (
          <MatchEventLog
            entries={log}
            homeShort={view.home.shortName}
            awayShort={view.away.shortName}
            emptyLabel={t("match.log.empty")}
            ariaLabel={t("match.sideTab.events")}
          />
        ) : null}

        {sideTab === "stats" ? (
          <MatchStats view={view} stats={frame.stats} ownTeamId={ownTeamId} compact />
        ) : null}

        {sideTab === "lineups" ? (
          <>
            <div className="tc-chips" role="group" aria-label={t("match.sideTab.lineups")}>
              {(["home", "away"] as const).map((side) => {
                const team = side === "home" ? view.home : view.away;
                return (
                  <button
                    key={side}
                    type="button"
                    className="tc-chip tc-chip--dense"
                    aria-pressed={lineupSide === side}
                    onClick={() => setLineupSide(side)}
                  >
                    {team.shortName} · {team.formation}
                  </button>
                );
              })}
            </div>
            <table className="tc-table tc-table--compact">
              <caption className="tc-sr">{lineupTeam.name}</caption>
              <thead>
                <tr>
                  <th scope="col" className="tc-num">
                    {t("match.col.shirt")}
                  </th>
                  <th scope="col">{t("squad.col.name")}</th>
                  <th scope="col">{t("squad.col.pos")}</th>
                </tr>
              </thead>
              <tbody>
                {lineupRows.map((row) => (
                  <tr key={row.id} className={row.id === frame.ballCarrierId ? "tc-row--mark" : undefined}>
                    <td className="tc-num">{row.shirt}</td>
                    <td>{row.name}</td>
                    <td>{row.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}
      </div>
    </aside>
  );
}
