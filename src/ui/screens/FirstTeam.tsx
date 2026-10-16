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
import { t } from "../../i18n/index.ts";
import { COACH_TARGET } from "../../tutorial/tutorial-targets.ts";
import { useTutorialTabFocus } from "../tutorial/use-tutorial-tab-focus.ts";

/**
 * WIREFRAME: docs/prd/design.md §9.11 — Kader (Tabellen-Layout wie Jugendliste)
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
  useT();
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
    { id: "mentoring", label: "Mentoring" },
    { id: "staff", label: "Staff" },
  ];

  return (
    <main className="squad club-shell-card-body">
      <div
        className="fm-tab-bar"
        role="tablist"
        aria-label={t("squad.tab.aria")}
        data-coach-target={COACH_TARGET.squadTabs}
      >
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
              {onOpenMedical ? (
                <p className="medical-muted">
                  {t("medical.squadHint")}{" "}
                  <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={onOpenMedical}>
                    {t("shell.nav.medical")}
                  </button>
                </p>
              ) : null}
            </>
          ) : (
            <p className="hub-inbox-empty">Staff-Bereich im Kader — Daten aus Training migriert.</p>
          )}
        </div>
      ) : null}
    </main>
  );
}
