/** F12.4 + F12.8 — client-side display & privacy preferences (PRD 09.3, PRD 18). */

import { htmlLang, isLocaleId, type LocaleId } from "../i18n/locale-id.ts";
import { setLocale } from "../i18n/index.ts";
import type { DiagnosticLogLevel } from "../telemetry/diagnostic-log.ts";

export type { DiagnosticLogLevel };

export type TextScaleId = "compact" | "default" | "large" | "xlarge";
export type ColorSchemeId = "default" | "contrast";

export interface ClientPreferences {
  textScale: TextScaleId;
  colorScheme: ColorSchemeId;
  locale: LocaleId;
  localeChosen?: boolean;
  analyticsEnabled: boolean;
  diagnosticLogLevel: DiagnosticLogLevel;
}

/** @deprecated use ClientPreferences */
export type AccessibilityPreferences = ClientPreferences;

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

const LEGACY_KEY = "fc-tycoon-a11y";
const STORAGE_KEY = "fc-tycoon-client-prefs";

const DIAG_LEVELS: readonly DiagnosticLogLevel[] = ["off", "error", "verbose"];

const DEFAULT_PREFERENCES: ClientPreferences = {
  textScale: "default",
  colorScheme: "default",
  locale: "de",
  localeChosen: false,
  analyticsEnabled: true,
  diagnosticLogLevel: "error",
};

function parseDiagnosticLevel(value: unknown): DiagnosticLogLevel {
  if (typeof value === "string" && DIAG_LEVELS.includes(value as DiagnosticLogLevel)) {
    return value as DiagnosticLogLevel;
  }
  return DEFAULT_PREFERENCES.diagnosticLogLevel;
}

function parsePartial(raw: string): ClientPreferences {
  const parsed = JSON.parse(raw) as Partial<ClientPreferences>;
  const textScale = TEXT_SCALE_OPTIONS.some((option) => option.id === parsed.textScale)
    ? (parsed.textScale as TextScaleId)
    : DEFAULT_PREFERENCES.textScale;
  const colorScheme = COLOR_SCHEME_OPTIONS.some((option) => option.id === parsed.colorScheme)
    ? (parsed.colorScheme as ColorSchemeId)
    : DEFAULT_PREFERENCES.colorScheme;
  const locale =
    parsed.locale && isLocaleId(parsed.locale) ? parsed.locale : DEFAULT_PREFERENCES.locale;
  return {
    textScale,
    colorScheme,
    locale,
    localeChosen: Boolean(parsed.localeChosen),
    analyticsEnabled:
      typeof parsed.analyticsEnabled === "boolean"
        ? parsed.analyticsEnabled
        : DEFAULT_PREFERENCES.analyticsEnabled,
    diagnosticLogLevel: parseDiagnosticLevel(parsed.diagnosticLogLevel),
  };
}

function urlDiagnosticOverride(): DiagnosticLogLevel | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("diag");
  if (value === "verbose" || value === "error" || value === "off") return value;
  return null;
}

export function effectiveDiagnosticLogLevel(prefs: ClientPreferences): DiagnosticLogLevel {
  const url = urlDiagnosticOverride();
  if (url) return url;
  if (import.meta.env.DEV && prefs.diagnosticLogLevel === "error") {
    return "verbose";
  }
  return prefs.diagnosticLogLevel;
}

export function loadClientPreferences(): ClientPreferences {
  if (typeof localStorage === "undefined") return DEFAULT_PREFERENCES;
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return parsePartial(current);
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrated = parsePartial(legacy);
      saveClientPreferences(migrated);
      return migrated;
    }
    return DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveClientPreferences(preferences: ClientPreferences): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

export function applyClientPreferences(preferences: ClientPreferences): void {
  applyAccessibilityPreferences(preferences);
}

export function loadAccessibilityPreferences(): ClientPreferences {
  return loadClientPreferences();
}

export function saveAccessibilityPreferences(preferences: ClientPreferences): void {
  saveClientPreferences(preferences);
}

export function hasChosenLocale(preferences: ClientPreferences): boolean {
  return Boolean(preferences.localeChosen);
}

export function textScaleFactor(id: TextScaleId): number {
  return TEXT_SCALE_OPTIONS.find((option) => option.id === id)?.factor ?? 1;
}

export function applyAccessibilityPreferences(preferences: ClientPreferences): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--text-scale", String(textScaleFactor(preferences.textScale)));
  root.dataset.colorScheme = preferences.colorScheme;
  setLocale(preferences.locale);
  root.lang = htmlLang(preferences.locale);
  root.dataset.locale = preferences.locale;
}
