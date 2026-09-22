import type { FormationId, SandboxPlan } from "@fussballmanager/shared";
import { FORMATION_IDS, sandboxPlanFromFormation } from "@fussballmanager/shared";

type SideProps = {
  label: string;
  plan: SandboxPlan;
  onChange: (next: SandboxPlan) => void;
};

function Side({ label, plan, onChange }: SideProps) {
  const set = (patch: Partial<SandboxPlan>) => onChange({ ...plan, ...patch });
  return (
    <fieldset className="tactics-side">
      <legend>{label}</legend>
      <label>
        Formation
        <select
          value={plan.formation}
          onChange={(event) =>
            onChange(sandboxPlanFromFormation(event.target.value as FormationId))
          }
        >
          {FORMATION_IDS.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>
      <label>
        Mentality {plan.mentality}
        <input
          type="range"
          min={0}
          max={100}
          value={plan.mentality}
          onChange={(event) => set({ mentality: Number(event.target.value) })}
        />
      </label>
      <label>
        Pressing {plan.pressing}
        <input
          type="range"
          min={0}
          max={100}
          value={plan.pressing}
          onChange={(event) => set({ pressing: Number(event.target.value) })}
        />
      </label>
      <label>
        Width {plan.width}
        <input
          type="range"
          min={0}
          max={100}
          value={plan.width}
          onChange={(event) => set({ width: Number(event.target.value) })}
        />
      </label>
      <label>
        Fluidity {plan.fluidity}
        <input
          type="range"
          min={0}
          max={100}
          value={plan.fluidity}
          onChange={(event) => set({ fluidity: Number(event.target.value) })}
        />
      </label>
      <label>
        Tempo {plan.tempo}
        <input
          type="range"
          min={0}
          max={100}
          value={plan.tempo}
          onChange={(event) => set({ tempo: Number(event.target.value) })}
        />
      </label>
      <label>
        Line {plan.lineHeight}
        <input
          type="range"
          min={25}
          max={90}
          value={plan.lineHeight}
          onChange={(event) => set({ lineHeight: Number(event.target.value) })}
        />
      </label>
      <label>
        Intensity {plan.intensity}
        <input
          type="range"
          min={80}
          max={130}
          value={plan.intensity}
          onChange={(event) => set({ intensity: Number(event.target.value) })}
        />
      </label>
      <label>
        Marking
        <select
          value={plan.marking}
          onChange={(event) =>
            set({ marking: event.target.value as SandboxPlan["marking"] })
          }
        >
          <option value="zonal">zonal</option>
          <option value="man">man</option>
        </select>
      </label>
      <label>
        Keeper
        <select
          value={plan.keeperDuty}
          onChange={(event) =>
            set({ keeperDuty: event.target.value as SandboxPlan["keeperDuty"] })
          }
        >
          <option value="stay">stay</option>
          <option value="sweeper">sweeper</option>
        </select>
      </label>
      <label>
        Full-backs
        <select
          value={plan.fullbackDuty}
          onChange={(event) =>
            set({
              fullbackDuty: event.target.value as SandboxPlan["fullbackDuty"],
            })
          }
        >
          <option value="inside">inside</option>
          <option value="overlap">overlap</option>
        </select>
      </label>
      <label>
        Wide
        <select
          value={plan.wideDuty}
          onChange={(event) =>
            set({ wideDuty: event.target.value as SandboxPlan["wideDuty"] })
          }
        >
          <option value="wide">wide</option>
          <option value="invert">invert</option>
        </select>
      </label>
      <label>
        Striker
        <select
          value={plan.strikerDuty}
          onChange={(event) =>
            set({
              strikerDuty: event.target.value as SandboxPlan["strikerDuty"],
            })
          }
        >
          <option value="poacher">poacher</option>
          <option value="target">target</option>
          <option value="false_nine">false nine</option>
        </select>
      </label>
    </fieldset>
  );
}

type TacticsBoardProps = {
  home: SandboxPlan;
  away: SandboxPlan;
  onHome: (next: SandboxPlan) => void;
  onAway: (next: SandboxPlan) => void;
};

export function TacticsBoard({ home, away, onHome, onAway }: TacticsBoardProps) {
  return (
    <section className="tactics-board" aria-label="Tactics sandbox">
      <Side label="Nordstern" plan={home} onChange={onHome} />
      <Side label="Rheinwacht" plan={away} onChange={onAway} />
    </section>
  );
}
