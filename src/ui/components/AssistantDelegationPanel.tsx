/** WIREFRAME: PRD 09 — F8.5 Assistenten-Delegation, on tc components (design.md §4.3, §9.11) */
import { ClipboardList, Dumbbell, Telescope, type LucideIcon } from "lucide-react";
import {
  ASSISTANT_DELEGATION_TASKS,
  assistantQuality,
  assistantQualityTier,
  type AssistantDelegation,
  type AssistantDelegationTask,
} from "../../staff/assistant-delegation.ts";
import type { CoachingStaff } from "../../staff/coaching-staff.ts";
import { useT } from "../../i18n/react.ts";

const TASK_ICONS: Record<AssistantDelegationTask, LucideIcon> = {
  lineup: ClipboardList,
  training: Dumbbell,
  scouting: Telescope,
};

export function AssistantDelegationPanel({
  assistantName,
  staff,
  delegation,
  onChange,
}: {
  assistantName: string;
  staff: CoachingStaff;
  delegation: AssistantDelegation;
  onChange: (task: AssistantDelegationTask, enabled: boolean) => void;
}) {
  const t = useT();
  const quality = assistantQuality(staff);

  return (
    <section className="tc-panel" aria-labelledby="squad-assistant-title">
      <div className="tc-panel__head">
        <div>
          <span className="tc-label">{t("staff.assistant.label")}</span>
          <h2 className="tc-panel__title" id="squad-assistant-title">
            {assistantName}
          </h2>
        </div>
        <span className="tc-panel__meta">
          {t("staff.assistant.quality", {
            quality,
            tier: t(`staff.assistant.tier.${assistantQualityTier(quality)}`),
          })}
        </span>
      </div>
      <p className="tc-page-sub tc-section__title">{t("staff.assistant.lead")}</p>

      <ul className="tc-checks">
        {ASSISTANT_DELEGATION_TASKS.map((task) => {
          const Icon = TASK_ICONS[task.key];
          return (
            <li key={task.key}>
              <label className="tc-check">
                <input
                  type="checkbox"
                  checked={delegation[task.key]}
                  onChange={(event) => onChange(task.key, event.target.checked)}
                />
                <Icon className="tc-icon" aria-hidden="true" />
                <span className="tc-check__copy">
                  <span className="tc-check__title">{t(`staff.delegation.${task.key}.label`)}</span>
                  <span className="tc-check__hint">{t(`staff.delegation.${task.key}.hint`)}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
