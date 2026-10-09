/** WIREFRAME: docs/prd/design.md §9.15 — Live-Regeln (rechte Spalte) */
import { useState } from "react";
import type { MatchView, MatchViewFrame } from "@fussballmanager/shared";
import { Lineup } from "./Lineup.tsx";
import { MatchStats } from "./MatchStats.tsx";

type SideTab = "stats" | "lineups";

export function MatchdayLivePanel({
  view,
  frame,
}: {
  view: MatchView;
  frame: MatchViewFrame;
}) {
  const [sideTab, setSideTab] = useState<SideTab>("stats");

  return (
    <aside className="matchday-cockpit-side game-panel" aria-label="Live-Regeln">
      <div className="matchday-side-tabs" role="tablist" aria-label="Live-Inhalt">
        {(
          [
            ["stats", "Statistik"],
            ["lineups", "Aufstellungen"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={sideTab === id}
            className={sideTab === id ? "matchday-side-tab is-active" : "matchday-side-tab"}
            onClick={() => setSideTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="matchday-side-panel" role="tabpanel">
        {sideTab === "stats" ? <MatchStats view={view} stats={frame.stats} compact /> : null}

        {sideTab === "lineups" ? (
          <div className="matchday-side-lineups">
            <Lineup view={view} frame={frame} fullClubNames />
          </div>
        ) : null}
      </div>
    </aside>
  );
}
