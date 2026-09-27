/** F12.4 — client-side display preferences (PRD 09.3). */

export type TextScaleId = "compact" | "default" | "large" | "xlarge";
export type ColorSchemeId = "default" | "contrast";

export interface AccessibilityPreferences {
  textScale: TextScaleId;
  colorScheme: ColorSchemeId;
}

export const TEXT_SCALE_OPTIONS: readonly { id: TextScaleId; label: string; factor: number }[] = [
  { id: "compact", label: "Kompakt", factor: 0.9 },
  { id: "default", label: "Standard", factor: 1 },
  { id: "large", label: "Groß", factor: 1.15 },
  { id: "xlarge", label: "Sehr groß", factor: 1.3 },
];

export const COLOR_SCHEME_OPTIONS: readonly { id: ColorSchemeId; label: string }[] = [
  { id: "default", label: "Standard" },
  { id: "contrast", label: "Hoher Kontrast" },
];

const STORAGE_KEY = "fc-tycoon-a11y";

const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  textScale: "default",
  colorScheme: "default",
};

export function loadAccessibilityPreferences(): AccessibilityPreferences {
  if (typeof localStorage === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<AccessibilityPreferences>;
    const textScale = TEXT_SCALE_OPTIONS.some((option) => option.id === parsed.textScale)
      ? (parsed.textScale as TextScaleId)
      : DEFAULT_PREFERENCES.textScale;
    const colorScheme = COLOR_SCHEME_OPTIONS.some((option) => option.id === parsed.colorScheme)
      ? (parsed.colorScheme as ColorSchemeId)
      : DEFAULT_PREFERENCES.colorScheme;
    return { textScale, colorScheme };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveAccessibilityPreferences(preferences: AccessibilityPreferences): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

export function textScaleFactor(id: TextScaleId): number {
  return TEXT_SCALE_OPTIONS.find((option) => option.id === id)?.factor ?? 1;
}

export function applyAccessibilityPreferences(preferences: AccessibilityPreferences): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--text-scale", String(textScaleFactor(preferences.textScale)));
  root.dataset.colorScheme = preferences.colorScheme;
}
