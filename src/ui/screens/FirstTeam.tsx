import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import { MentoringPanel } from "../components/MentoringPanel.tsx";
import { CoachingStaffPanel } from "../components/CoachingStaffPanel.tsx";
import { AssistantDelegationPanel } from "../components/AssistantDelegationPanel.tsx";
import { FitnessManagementPanel } from "../components/FitnessManagementPanel.tsx";
import type { Coach, CoachingStaff } from "../../staff/coaching-staff.ts";
import type { AssistantDelegation, AssistantDelegationTask } from "../../staff/assistant-delegation.ts";

type SquadTab = "list" | "mentoring" | "staff";
import type { Player } from "../../types/player.ts";
import {
  formatMarketValueShort,
  listProSquad,
  sortProSquadRows,
  type ProSquadSortDirection,
  type ProSquadSortKey,
} from "../../squad/pro-roster.ts";
import { caDeltaClassName, caDeltaMark, formatCaDelta } from "../../player/ca-tracking.ts";
import { Hint } from "../components/Hint.tsx";
import { PlayerPortrait } from "../components/PlayerPortrait.tsx";
import { formMark, stateMark } from "../player-profile.ts";
import { useT } from "../../i18n/react.ts";
import { t } from "../../i18n/index.ts";

/**
 * WIREFRAME: docs/prd/design.md §9.11 — Kader
 * ┌──────────────────────────────────────────────┐
 * │ ←  ⭐ Profikader · 14 Spieler                │
 * │ Ø CA 74 · Marktwert 18.2M                    │
 * ├──────────────────────────────────────────────┤
 * │ Neuer · GK · 28 J. · CA 81 · 2.1M · ●       │
 * │ Hummels · CB · 27 J. · CA 78 · 1.8M · ▲     │
 * └──────────────────────────────────────────────┘
 */

const DEFAULT_SORT: { key: ProSquadSortKey; direction: ProSquadSortDirection } = {
  key: "position",
  direction: "asc",
};

export function FirstTeam({
  players,
  clubId,
  season,
  trainingIntensity = 100,
  onSelectPlayer,
  week = 1,
  coachingStaff,
  masterSeed = 0,
  cash = 0,
  onHireCoach,
  assistantName = "",
  assistantDelegation,
  onAssistantDelegationChange,
  onAssignMentor,
  onClearMentor,
  injuryRiskFactor = 1,
}: {
  players: readonly Player[];
  clubId: string;
  season: number;
  trainingIntensity?: number;
  onSelectPlayer: (playerId: string) => void;
  week?: number;
  coachingStaff?: CoachingStaff;
  masterSeed?: number;
  cash?: number;
  onHireCoach?: (coach: Coach) => void;
  assistantName?: string;
  assistantDelegation?: AssistantDelegation;
  onAssistantDelegationChange?: (task: AssistantDelegationTask, enabled: boolean) => void;
  onAssignMentor?: (menteeId: string, mentorId: string) => void;
  onClearMentor?: (menteeId: string) => void;
  injuryRiskFactor?: number;
}) {
  useT();
  const [squadTab, setSquadTab] = useState<SquadTab>("list");
  const [sortKey, setSortKey] = useState<ProSquadSortKey>(DEFAULT_SORT.key);
  const [sortDirection, setSortDirection] = useState<ProSquadSortDirection>(DEFAULT_SORT.direction);

  const rows = useMemo(() => {
    const baseRows = listProSquad(players, clubId, trainingIntensity);
    return sortProSquadRows(baseRows, sortKey, sortDirection);
  }, [players, clubId, trainingIntensity, sortKey, sortDirection]);

  const avgCa =
    rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + row.ca, 0) / rows.length) : 0;
  const totalValue = rows.reduce((sum, row) => sum + row.marketValue, 0);

  const toggleSort = (key: ProSquadSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "desc" ? "asc" : "desc"));
      return;
    }
    setSortKey(key);
    setSortDirection(key === "name" || key === "position" ? "asc" : "desc");
  };

  const squadTabs: { id: SquadTab; label: string }[] = [
    { id: "list", label: t("shell.nav.squad") },
    { id: "mentoring", label: "Mentoring" },
    { id: "staff", label: "Staff" },
  ];

  return (
    <main className="squad club-shell-card-body">
      <div className="fm-tab-bar" role="tablist" aria-label="Kader-Bereiche">
        {squadTabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={squadTab === id}
            className={squadTab === id ? "fm-tab is-active" : "fm-tab"}
            onClick={() => setSquadTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {squadTab === "list" ? (
        <div className="fm-tab-panel">
          {rows.length === 0 ? (
            <section className="squad-empty" aria-label={t("squad.empty.aria")}>
              <span className="squad-empty-icon" aria-hidden="true">
                <Users size={28} strokeWidth={2.5} />
              </span>
              <p>{t("squad.empty")}</p>
              <p className="squad-empty-hint">{t("squad.emptyHint")}</p>
            </section>
          ) : (
            <>
              <div className="squad-list-head">
                <div className="squad-list-toolbar" role="toolbar" aria-label={t("squad.sort.aria", { defaultValue: "Sortieren" })}>
                  {(
                    [
                      ["name", t("squad.col.name")],
                      ["position", t("squad.col.pos")],
                      ["ca", "CA"],
                      ["form", "Form"],
                      ["age", t("squad.col.age")],
                    ] as const
                  ).map(([key, label]) => {
                    const active = sortKey === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        className={active ? "squad-sort-chip is-active" : "squad-sort-chip"}
                        aria-pressed={active}
                        onClick={() => toggleSort(key)}
                      >
                        {label}
                        {active ? (sortDirection === "asc" ? " ▲" : " ▼") : ""}
                      </button>
                    );
                  })}
                </div>
                <Hint text={t("squad.hint")}>
                  <p className="squad-summary squad-summary--head">
                    {t("squad.summaryHead", {
                      avgCa,
                      value: formatMarketValueShort(totalValue),
                    })}
                  </p>
                </Hint>
              </div>
              <ul className="squad-player-cards" aria-label={t("squad.title")}>
                {rows.map((row) => {
                  const player = players.find((entry) => entry.id === row.playerId);
                  const fit = stateMark(row.fitness, 75, 50);
                  const form = formMark(row.form);
                  return (
                    <li key={row.playerId} className="squad-player-card game-panel">
                      {player ? (
                        <PlayerPortrait seed={player.portrait_seed} size="sm" className="squad-player-card-portrait" />
                      ) : null}
                      <div className="squad-player-card-body">
                        <button type="button" className="squad-player-card-main" onClick={() => onSelectPlayer(row.playerId)}>
                          <strong>{row.displayName}</strong>
                          <span className="squad-player-card-meta">
                            {row.position} · {row.age} J. · CA {row.ca}
                            <span className={caDeltaClassName(row.caDelta)} title="CA Δ">
                              {" "}
                              {caDeltaMark(row.caDelta)}
                              {formatCaDelta(row.caDelta)}
                            </span>
                          </span>
                          <span className="squad-player-card-status">
                            {row.injuryWeeks !== null ? (
                              <span className="squad-injury" title="Verletzt — kein Einsatz">
                                Verletzt · {row.injuryWeeks} Wo.
                              </span>
                            ) : (
                              <span className={`squad-fitness is-${fit.tone}`}>
                                Fit {row.fitness}
                                <span className="squad-shape-mark" aria-hidden="true">
                                  {fit.mark}
                                </span>
                              </span>
                            )}
                            · {formatMarketValueShort(row.marketValue)}
                            <span className={`squad-form is-${form.tone}`} title={`Form ${row.form}`}>
                              <span className="squad-shape-mark" aria-hidden="true">
                                {form.mark}
                              </span>
                            </span>
                          </span>
                        </button>
                        <div className="squad-player-card-actions">
                          <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => onSelectPlayer(row.playerId)}>
                            Profil
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      ) : null}

      {squadTab === "mentoring" ? (
        <div className="fm-tab-panel">
          {onAssignMentor && onClearMentor ? (
            <MentoringPanel
              players={players}
              clubId={clubId}
              season={season}
              week={week}
              onAssignMentor={onAssignMentor}
              onClearMentor={onClearMentor}
            />
          ) : (
            <p className="hub-inbox-empty">Mentoring nicht verfügbar.</p>
          )}
        </div>
      ) : null}

      {squadTab === "staff" ? (
        <div className="fm-tab-panel">
          {coachingStaff && onHireCoach && assistantDelegation && onAssistantDelegationChange ? (
            <>
              <AssistantDelegationPanel
                assistantName={assistantName}
                staff={coachingStaff}
                delegation={assistantDelegation}
                onChange={onAssistantDelegationChange}
              />
              <CoachingStaffPanel
                staff={coachingStaff}
                season={season}
                week={week}
                masterSeed={masterSeed}
                cash={cash}
                onHire={onHireCoach}
              />
              <FitnessManagementPanel
                players={players}
                clubId={clubId}
                intensity={trainingIntensity}
                injuryRiskFactor={injuryRiskFactor}
              />
            </>
          ) : (
            <p className="hub-inbox-empty">Staff-Bereich im Kader — Daten aus Training migriert.</p>
          )}
        </div>
      ) : null}
    </main>
  );
}

