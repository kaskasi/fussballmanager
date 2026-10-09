/** WIREFRAME: docs/prd/design.md §9.15 — Live-Regeln (rechte Spalte) */
import { useMemo, useState } from "react";
import type { MatchView, MatchViewFrame } from "@fussballmanager/shared";
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
  const [sideTab, setSideTab] = useState<SideTab>("stats");
  const kickoffFrame = useMemo(() => frameAt(view, 0), [view]);

  return (
    <aside
      className="matchday-cockpit-side matchday-cockpit-side--live game-panel"
      aria-label="Live-Regeln"
    >
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
