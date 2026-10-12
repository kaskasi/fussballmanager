/** WIREFRAME: docs/prd/design.md §9.15 — Live-Regeln (rechte Spalte) */
import { useMemo, useState } from "react";
import type { MatchView, MatchViewFrame } from "@fussballmanager/shared";
import { useT } from "../i18n/react.ts";
import { MatchSideLineupPitch } from "./MatchSideLineupPitch.tsx";
import { MatchStats } from "./MatchStats.tsx";
import { frameAt } from "./useMatchPlayback.ts";

type SideTab = "stats" | "lineups";

export function MatchdayLivePanel({
  view,
  frame,
}: {
  view: MatchView;
  frame: MatchViewFrame;
}) {
  const t = useT();
  const [sideTab, setSideTab] = useState<SideTab>("stats");
  const kickoffFrame = useMemo(() => frameAt(view, 0), [view]);

  const tabs: { id: SideTab; labelKey: "match.sideTab.stats" | "match.sideTab.lineups" }[] = [
    { id: "stats", labelKey: "match.sideTab.stats" },
    { id: "lineups", labelKey: "match.sideTab.lineups" },
  ];

  return (
    <aside
      className="matchday-cockpit-side matchday-cockpit-side--live game-panel"
      aria-label={t("match.live.sideAria")}
    >
      <div className="matchday-side-tabs" role="tablist" aria-label={t("match.live.sideTabsAria")}>
        {tabs.map(({ id, labelKey }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={sideTab === id}
            className={sideTab === id ? "matchday-side-tab is-active" : "matchday-side-tab"}
            onClick={() => setSideTab(id)}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      <div className="matchday-side-panel matchday-side-panel--live" role="tabpanel">
        {sideTab === "stats" ? <MatchStats view={view} stats={frame.stats} compact /> : null}

        {sideTab === "lineups" ? (
          <div className="matchday-side-lineups">
            <p className="matchday-side-lineup-meta">
              {view.home.shortName} {view.home.formation}
              <span aria-hidden="true"> · </span>
              {view.away.shortName} {view.away.formation}
            </p>
            <MatchSideLineupPitch view={view} kickoffFrame={kickoffFrame} />
          </div>
        ) : null}
      </div>
    </aside>
  );
}
