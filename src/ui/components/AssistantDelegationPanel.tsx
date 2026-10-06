/** WIREFRAME: PRD 09 — F8.5 Assistenten-Delegation */
import { ClipboardList, Dumbbell, HardHat, Telescope, type LucideIcon } from "lucide-react";
import {
  ASSISTANT_DELEGATION_TASKS,
  assistantQuality,
  assistantQualityLabel,
  type AssistantDelegation,
  type AssistantDelegationTask,
} from "../../staff/assistant-delegation.ts";
import type { CoachingStaff } from "../../staff/coaching-staff.ts";
import { Hint } from "./Hint.tsx";

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
  const quality = assistantQuality(staff);

  return (
    <section className="assistant-delegation" aria-label="Assistenten-Delegation">
      <header className="assistant-delegation-head">
        <div>
          <h2>
            <HardHat size={20} strokeWidth={2.5} aria-hidden className="assistant-delegation-title-icon" />{" "}
            {assistantName}
          </h2>
          <p className="assistant-delegation-meta">
            Taktik-Qualität {quality} · {assistantQualityLabel(quality)}
          </p>
        </div>
        <Hint
          text="Aufstellung und Scouting kann er übernehmen. Wochenplan nur als Erinnerung — du setzt den Plan selbst."
          block
        >
          <span className="assistant-delegation-badge">F8.5</span>
        </Hint>
      </header>

      <ul className="assistant-delegation-list">
        {ASSISTANT_DELEGATION_TASKS.map((task) => (
          <li key={task.key}>
            <label className="assistant-delegation-row">
              <input
                type="checkbox"
                checked={delegation[task.key]}
                onChange={(event) => onChange(task.key, event.target.checked)}
              />
              <span className="assistant-delegation-icon" aria-hidden="true">
                {(() => {
                  const Icon = TASK_ICONS[task.key];
                  return <Icon size={18} strokeWidth={2.5} />;
                })()}
              </span>
              <span className="assistant-delegation-copy">
                <strong>{task.label}</strong>
                <small>{task.hint}</small>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
