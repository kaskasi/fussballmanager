import {
  sandboxPlanFromFormation,
  type FormationId,
  type SandboxPlan,
} from "@fussballmanager/shared";

export const TACTICS_PRESET_SLOTS = 3 as const;

export type TacticsPresetId = 1 | 2 | 3;

export interface TacticsPresetSlot {
  id: TacticsPresetId;
  label: string;
  plan: SandboxPlan;
}

const PRESET_LABELS: Record<TacticsPresetId, string> = {
  1: "Ballbesitz",
  2: "Kompakt",
  3: "Offensiv",
};

const PRESET_FORMATIONS: Record<TacticsPresetId, FormationId> = {
  1: "4-3-3",
  2: "4-4-2",
  3: "2-3-5",
};

export function defaultTacticsPresets(): TacticsPresetSlot[] {
  return ([1, 2, 3] as const).map((id) => ({
    id,
    label: PRESET_LABELS[id],
    plan: sandboxPlanFromFormation(PRESET_FORMATIONS[id]),
  }));
}

export function normalizeTacticsPresets(
  presets?: readonly TacticsPresetSlot[],
): TacticsPresetSlot[] {
  const defaults = defaultTacticsPresets();
  if (!presets || presets.length === 0) return defaults;
  return defaults.map((fallback) => {
    const saved = presets.find((entry) => entry.id === fallback.id);
    if (!saved?.plan?.formation) return fallback;
    return {
      id: fallback.id,
      label: saved.label?.trim() || fallback.label,
      plan: saved.plan,
    };
  });
}

export function saveTacticsPreset(
  presets: readonly TacticsPresetSlot[],
  id: TacticsPresetId,
  plan: SandboxPlan,
  label?: string,
): TacticsPresetSlot[] {
  const base = normalizeTacticsPresets(presets);
  return base.map((slot) =>
    slot.id === id
      ? {
          ...slot,
          label: label?.trim() || slot.label,
          plan: { ...plan },
        }
      : slot,
  );
}

export function loadTacticsPreset(
  presets: readonly TacticsPresetSlot[],
  id: TacticsPresetId,
): SandboxPlan {
  const slot = normalizeTacticsPresets(presets).find((entry) => entry.id === id);
  return slot ? { ...slot.plan } : sandboxPlanFromFormation("4-3-3");
}
