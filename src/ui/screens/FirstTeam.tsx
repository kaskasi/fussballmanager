import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import { MentoringPanel } from "../components/MentoringPanel.tsx";
import { CoachingStaffPanel } from "../components/CoachingStaffPanel.tsx";
import { AssistantDelegationPanel } from "../components/AssistantDelegationPanel.tsx";
import { ProSquadRosterPanel } from "../components/ProSquadRosterPanel.tsx";
import type { Coach, CoachingStaff } from "../../staff/coaching-staff.ts";
import type { AssistantDelegation, AssistantDelegationTask } from "../../staff/assistant-delegation.ts";

type SquadTab = "list" | "mentoring" | "staff";
import type { Player } from "../../types/player.ts";
import {
  listProSquad,
  type ProSquadSortDirection,
  type ProSquadSortKey,
} from "../../squad/pro-roster.ts";
import { useT } from "../../i18n/react.ts";
import { FmScreenTab, FmScreenTabBar } from "../components/FmScreenTabBar.tsx";
import { COACH_TARGET } from "../../tutorial/tutorial-targets.ts";
import { useTutorialTabFocus } from "../tutorial/use-tutorial-tab-focus.ts";

/**
 * WIREFRAME: docs/prd/design.md §9.11 — Kader. Built from tc- components (design.md §4.3); tabs are the shared FmScreenTabBar.
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
  onOpenMedical,
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
  onOpenMedical?: () => void;
}) {
  const t = useT();
  const [squadTab, setSquadTab] = useState<SquadTab>("list");
  useTutorialTabFocus("squad", "squad.open_profile", "list", setSquadTab);
  const [sortKey, setSortKey] = useState<ProSquadSortKey>(DEFAULT_SORT.key);
  const [sortDirection, setSortDirection] = useState<ProSquadSortDirection>(DEFAULT_SORT.direction);

  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);

  const rows = useMemo(
    () => listProSquad(players, clubId, trainingIntensity),
    [players, clubId, trainingIntensity],
  );

  const avgCa =
    rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + row.ca, 0) / rows.length) : 0;
  const totalValue = rows.reduce((sum, row) => sum + row.marketValue, 0);

  const squadTabs: { id: SquadTab; label: string }[] = [
    { id: "list", label: t("shell.nav.squad") },
    { id: "mentoring", label: t("squad.tab.mentoring") },
    { id: "staff", label: t("squad.tab.staff") },
  ];

  return (
    <main className="squad club-shell-card-body">
      <FmScreenTabBar
        role="tablist"
        aria-label={t("squad.tab.aria")}
        data-coach-target={COACH_TARGET.squadTabs}
      >
        {squadTabs.map(({ id, label }) => (
          <FmScreenTab
            key={id}
            role="tab"
            aria-selected={squadTab === id}
            className={squadTab === id ? "is-active" : undefined}
            onClick={() => setSquadTab(id)}
          >
            {label}
          </FmScreenTab>
        ))}
      </FmScreenTabBar>

      {squadTab === "list" ? (
        <div className="fm-tab-panel">
          {rows.length === 0 ? (
            <section className="tc-panel tc-empty-state" aria-label={t("squad.empty.aria")}>
              <Users className="tc-icon" aria-hidden="true" />
              <p className="tc-empty-state__title">{t("squad.empty")}</p>
              <p>{t("squad.emptyHint")}</p>
            </section>
          ) : (
            <ProSquadRosterPanel
              rows={rows}
              playersById={playersById}
              avgCa={avgCa}
              totalValue={totalValue}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSortKeyChange={setSortKey}
              onSortDirectionChange={setSortDirection}
              onSelectPlayer={onSelectPlayer}
            />
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
            <p className="tc-empty">{t("squad.mentoring.unavailable")}</p>
          )}
        </div>
      ) : null}

      {squadTab === "staff" ? (
        <div className="fm-tab-panel">
          {coachingStaff && onHireCoach && assistantDelegation && onAssistantDelegationChange ? (
            <div className="tc-stack">
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
              {onOpenMedical ? (
                <p className="tc-row">
                  <span className="tc-caption">{t("medical.squadHint")}</span>
                  <button type="button" className="tc-btn tc-btn--sm" onClick={onOpenMedical}>
                    {t("shell.nav.medical")}
                  </button>
                </p>
              ) : null}
            </div>
          ) : (
            <p className="tc-empty">{t("squad.staff.unavailable")}</p>
          )}
        </div>
      ) : null}
    </main>
  );
}
