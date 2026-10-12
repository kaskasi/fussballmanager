/** Re-export client prefs (display + privacy + diagnostics). */

export {
  type ClientPreferences,
  type AccessibilityPreferences,
  type DiagnosticLogLevel,
  loadClientPreferences,
  saveClientPreferences,
  applyClientPreferences,
  effectiveDiagnosticLogLevel,
  loadAccessibilityPreferences,
  saveAccessibilityPreferences,
  applyAccessibilityPreferences,
  hasChosenLocale,
  TEXT_SCALE_OPTIONS,
  COLOR_SCHEME_OPTIONS,
  LOCALE_OPTIONS,
  textScaleFactor,
} from "./accessibility.ts";
