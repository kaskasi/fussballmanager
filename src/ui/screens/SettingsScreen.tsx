/** WIREFRAME: design.md §9 — Settings (display, saves, privacy, diagnostics) */
import { useCallback, useEffect, useState } from "react";
import {
  COLOR_SCHEME_OPTIONS,
  LOCALE_OPTIONS,
  TEXT_SCALE_OPTIONS,
  type ClientPreferences,
  type ColorSchemeId,
  type DiagnosticLogLevel,
  type TextScaleId,
  effectiveDiagnosticLogLevel,
} from "../accessibility.ts";
import type { LocaleId } from "../../i18n/locale-id.ts";
import { useT } from "../../i18n/react.ts";
import type { SaveGame } from "../../persistence/savegame-model.ts";
import { SaveManagerPanel } from "../components/SaveManagerPanel.tsx";
import {
  clearDiagnosticLog,
  formatDiagnosticLogForExport,
  getDiagnosticLogPreview,
  subscribeDiagnosticLog,
} from "../../telemetry/diagnostic-log.ts";
import { initAnalytics } from "../../telemetry/analytics.ts";
import { setDiagnosticLogLevel } from "../../telemetry/diagnostic-log.ts";
import { COACH_TARGET } from "../../tutorial/tutorial-targets.ts";

const DIAG_LEVEL_OPTIONS: readonly { id: DiagnosticLogLevel; labelKey: string }[] = [
  { id: "off", labelKey: "settings.diagnostics.levelOff" },
  { id: "error", labelKey: "settings.diagnostics.levelError" },
  { id: "verbose", labelKey: "settings.diagnostics.levelVerbose" },
];

export function SettingsScreen({
  preferences,
  onPreferencesChange,
  activeSlot,
  currentSave,
  onLoadSlot,
  onNewGameInSlot,
  onApplyCloudSave,
  onOpenMatchdaySandbox,
}: {
  preferences: ClientPreferences;
  onPreferencesChange: (next: ClientPreferences) => void;
  activeSlot: number;
  currentSave: SaveGame;
  onLoadSlot: (slot: number) => void;
  onNewGameInSlot: (slot: number) => void;
  onApplyCloudSave: (save: SaveGame, slot: number) => void;
  onOpenMatchdaySandbox: () => void;
}) {
  const t = useT();
  const [logPreview, setLogPreview] = useState(() => getDiagnosticLogPreview());
  const [copyNotice, setCopyNotice] = useState<string | null>(null);

  useEffect(() => {
    return subscribeDiagnosticLog(() => setLogPreview(getDiagnosticLogPreview()));
  }, []);

  const patchPrefs = useCallback(
    (patch: Partial<ClientPreferences>) => {
      const next = { ...preferences, ...patch };
      onPreferencesChange(next);
      const level = effectiveDiagnosticLogLevel(next);
      setDiagnosticLogLevel(level);
      initAnalytics(next);
    },
    [onPreferencesChange, preferences],
  );

  const handleCopyLog = useCallback(async () => {
    const text = formatDiagnosticLogForExport();
    try {
      await navigator.clipboard.writeText(text);
      setCopyNotice(t("settings.diagnostics.copyOk"));
    } catch {
      setCopyNotice(t("settings.diagnostics.copyFail"));
    }
  }, [t]);

  const handleDownloadLog = useCallback(() => {
    const text = formatDiagnosticLogForExport();
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `the-club-diagnostic-${stamp}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <main className="settings club-shell-card-body">
      <div className="settings-screen">
      <section className="game-panel settings-section" aria-labelledby="settings-display-title">
        <h2 id="settings-display-title" className="settings-section-title">
          {t("settings.display.title")}
        </h2>
        <p className="settings-section-lead">{t("shell.menu.displayNote")}</p>
        <label className="a11y-menu-field">
          <span>{t("shell.menu.language")}</span>
          <select
            value={preferences.locale}
            onChange={(event) =>
              patchPrefs({
                locale: event.target.value as LocaleId,
                localeChosen: true,
              })
            }
          >
            {LOCALE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.nativeLabel}
              </option>
            ))}
          </select>
        </label>
        <label className="settings-toggle-row">
          <input
            type="checkbox"
            checked={preferences.coachMarksEnabled}
            onChange={(event) => patchPrefs({ coachMarksEnabled: event.target.checked })}
          />
          <span>{t("settings.display.coachMarks")}</span>
        </label>
        <p className="settings-section-lead">{t("settings.display.coachMarksNote")}</p>
        <label className="a11y-menu-field">
          <span>{t("shell.menu.textScale")}</span>
          <select
            value={preferences.textScale}
            onChange={(event) =>
              patchPrefs({ textScale: event.target.value as TextScaleId })
            }
          >
            {TEXT_SCALE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </label>
        <label className="a11y-menu-field">
          <span>{t("shell.menu.colorScheme")}</span>
          <select
            value={preferences.colorScheme}
            onChange={(event) =>
              patchPrefs({ colorScheme: event.target.value as ColorSchemeId })
            }
          >
            {COLOR_SCHEME_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section
        className="game-panel settings-section"
        aria-labelledby="settings-saves-title"
        data-coach-target={COACH_TARGET.settingsSaveExport}
      >
        <h2 id="settings-saves-title" className="settings-section-title">
          {t("shell.menu.saves")}
        </h2>
        <SaveManagerPanel
          activeSlot={activeSlot}
          currentSave={currentSave}
          onLoadSlot={onLoadSlot}
          onNewGameInSlot={onNewGameInSlot}
          onApplyCloudSave={onApplyCloudSave}
        />
      </section>

      <section className="game-panel settings-section" aria-labelledby="settings-dev-title">
        <h2 id="settings-dev-title" className="settings-section-title">
          {t("settings.developer.title")}
        </h2>
        <p className="settings-section-lead">{t("settings.developer.lead")}</p>
        <button type="button" className="save-modal-btn" onClick={onOpenMatchdaySandbox}>
          {t("shell.menu.matchdaySandbox")}
        </button>
      </section>

      <section className="game-panel settings-section" aria-labelledby="settings-privacy-title">
        <h2 id="settings-privacy-title" className="settings-section-title">
          {t("settings.privacy.title")}
        </h2>
        <p className="settings-section-lead">{t("settings.privacy.lead")}</p>
        <label className="settings-toggle-row">
          <input
            type="checkbox"
            checked={preferences.analyticsEnabled}
            onChange={(event) => patchPrefs({ analyticsEnabled: event.target.checked })}
          />
          <span>{t("settings.privacy.analytics")}</span>
        </label>
      </section>

      <section className="game-panel settings-section" aria-labelledby="settings-diag-title">
        <h2 id="settings-diag-title" className="settings-section-title">
          {t("settings.diagnostics.title")}
        </h2>
        <p className="settings-section-lead">{t("settings.diagnostics.lead")}</p>
        <label className="a11y-menu-field">
          <span>{t("settings.diagnostics.level")}</span>
          <select
            value={preferences.diagnosticLogLevel}
            onChange={(event) =>
              patchPrefs({ diagnosticLogLevel: event.target.value as DiagnosticLogLevel })
            }
          >
            {DIAG_LEVEL_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </label>
        <textarea
          className="settings-diag-preview"
          readOnly
          value={logPreview}
          aria-label={t("settings.diagnostics.preview")}
          rows={12}
        />
        <div className="settings-diag-actions">
          <button type="button" className="save-modal-btn" onClick={() => void handleCopyLog()}>
            {t("settings.diagnostics.copy")}
          </button>
          <button type="button" className="save-modal-btn" onClick={handleDownloadLog}>
            {t("settings.diagnostics.download")}
          </button>
          <button
            type="button"
            className="save-modal-btn"
            onClick={() => {
              clearDiagnosticLog();
              setLogPreview("");
            }}
          >
            {t("settings.diagnostics.clear")}
          </button>
        </div>
        {copyNotice ? <p className="settings-copy-notice">{copyNotice}</p> : null}
      </section>
      </div>
    </main>
  );
}
