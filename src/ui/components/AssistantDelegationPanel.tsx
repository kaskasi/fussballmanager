/** WIREFRAME: PRD 09 — F8.5 Assistenten-Delegation */
import {
  ASSISTANT_DELEGATION_TASKS,
  assistantQuality,
  assistantQualityLabel,
  type AssistantDelegation,
  type AssistantDelegationTask,
} from "../../staff/assistant-delegation.ts";
import type { CoachingStaff } from "../../staff/coaching-staff.ts";
import { Hint } from "./Hint.tsx";

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
          <h2>🧢 {assistantName}</h2>
          <p className="assistant-delegation-meta">
            Taktik-Qualität {quality} · {assistantQualityLabel(quality)}
          </p>
        </div>
        <Hint
          text="Der Assistenztrainer übernimmt markierte Aufgaben automatisch. Schwächere Qualität = unschärfere Entscheidungen."
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
              <span className="assistant-delegation-icon" aria-hidden="true">{task.icon}</span>
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
