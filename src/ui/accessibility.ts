/** F12.4 + F12.8 — client-side display preferences (PRD 09.3, PRD 18). */

import { htmlLang, isLocaleId, type LocaleId } from "../i18n/locale-id.ts";
import { setLocale } from "../i18n/index.ts";

export type TextScaleId = "compact" | "default" | "large" | "xlarge";
export type ColorSchemeId = "default" | "contrast";

export interface AccessibilityPreferences {
  textScale: TextScaleId;
  colorScheme: ColorSchemeId;
  locale: LocaleId;
  /** Set when user confirms language in onboarding or Anzeige menu. */
  localeChosen?: boolean;
}

export const TEXT_SCALE_OPTIONS: readonly { id: TextScaleId; labelKey: string; factor: number }[] = [
  { id: "compact", labelKey: "a11y.textScale.compact", factor: 0.9 },
  { id: "default", labelKey: "a11y.textScale.default", factor: 1 },
  { id: "large", labelKey: "a11y.textScale.large", factor: 1.15 },
  { id: "xlarge", labelKey: "a11y.textScale.xlarge", factor: 1.3 },
];

export const COLOR_SCHEME_OPTIONS: readonly { id: ColorSchemeId; labelKey: string }[] = [
  { id: "default", labelKey: "a11y.colorScheme.default" },
  { id: "contrast", labelKey: "a11y.colorScheme.contrast" },
];

export const LOCALE_OPTIONS: readonly { id: LocaleId; nativeLabel: string }[] = [
  { id: "de", nativeLabel: "Deutsch" },
  { id: "en", nativeLabel: "English" },
  { id: "zh-Hans", nativeLabel: "简体中文" },
];

const STORAGE_KEY = "fc-tycoon-a11y";

const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  textScale: "default",
  colorScheme: "default",
  locale: "de",
  localeChosen: false,
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
    const locale =
      parsed.locale && isLocaleId(parsed.locale) ? parsed.locale : DEFAULT_PREFERENCES.locale;
    const localeChosen = Boolean(parsed.localeChosen);
    return { textScale, colorScheme, locale, localeChosen };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveAccessibilityPreferences(preferences: AccessibilityPreferences): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

export function hasChosenLocale(preferences: AccessibilityPreferences): boolean {
  return Boolean(preferences.localeChosen);
}

export function textScaleFactor(id: TextScaleId): number {
  return TEXT_SCALE_OPTIONS.find((option) => option.id === id)?.factor ?? 1;
}

export function applyAccessibilityPreferences(preferences: AccessibilityPreferences): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--text-scale", String(textScaleFactor(preferences.textScale)));
  root.dataset.colorScheme = preferences.colorScheme;
  setLocale(preferences.locale);
  root.lang = htmlLang(preferences.locale);
  root.dataset.locale = preferences.locale;
}
