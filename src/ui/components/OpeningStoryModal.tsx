import { useEffect, useRef, useState } from "react";
import type { CareerOrigin } from "../../narrative/story-state.ts";
import { leadershipCandidates } from "../../narrative/captain.ts";
import {
  isManagerNameReady,
  MANAGER_NAME_MAX,
  normalizeManagerName,
  PLACEHOLDER_MANAGER_NAMES,
} from "../../narrative/opening.ts";
import type { Player } from "../../types/player.ts";
import { LOCALE_OPTIONS } from "../accessibility.ts";
import { detectBrowserLocale, type LocaleId } from "../../i18n/locale-id.ts";
import { useT } from "../../i18n/react.ts";

const ORIGIN_IDS: CareerOrigin[] = ["raffle", "passionate_letter", "community_takeover"];

type OpeningStep = "language" | "name" | "story";

function initialDraftName(managerName: string): string {
  if (!managerName || PLACEHOLDER_MANAGER_NAMES.has(managerName)) return "";
  return managerName;
}

function initialStep(
  localeChosen: boolean,
  managerName: string,
): OpeningStep {
  if (!localeChosen) return "language";
  return isManagerNameReady(initialDraftName(managerName)) ? "story" : "name";
}

/**
 * WIREFRAME: PRD 13 + F12.8 — Career opening
 *
 *  1) 🌐 Anzeigesprache
 *  2) 🪪 Wie heißt du?
 *  3) Origin-Karten + Kapitän
 */
export function OpeningStoryModal({
  managerName,
  players,
  clubId,
  localeChosen,
  onLocalePick,
  onComplete,
}: {
  managerName: string;
  players: readonly Player[];
  clubId: string;
  localeChosen: boolean;
  onLocalePick: (locale: LocaleId) => void;
  onComplete: (origin: CareerOrigin, captainPlayerId: string, managerName: string) => void;
}) {
  const t = useT();
  const [draftName, setDraftName] = useState(() => initialDraftName(managerName));
  const [step, setStep] = useState<OpeningStep>(() => initialStep(localeChosen, managerName));
  const [highlightLocale, setHighlightLocale] = useState<LocaleId>(() => detectBrowserLocale());
  const [origin, setOrigin] = useState<CareerOrigin>("community_takeover");
  const candidates = leadershipCandidates(players, clubId);
  const [captainId, setCaptainId] = useState(candidates[0]?.player.id ?? "");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const readyName = isManagerNameReady(draftName);
  const displayName = readyName ? normalizeManagerName(draftName) : "";

  useEffect(() => {
    if (step !== "name") return;
    nameInputRef.current?.focus();
  }, [step]);

  function submitName() {
    if (!readyName) return;
    setDraftName(normalizeManagerName(draftName));
    setStep("story");
  }

  function pickLanguage(locale: LocaleId) {
    onLocalePick(locale);
    setStep("name");
  }

  const stepLabel =
    step === "language"
      ? t("opening.step.language")
      : step === "name"
        ? t("opening.step.name")
        : t("opening.step.story");

  return (
    <div className="inbox-backdrop" role="presentation">
      <div
        className="inbox-modal opening-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("opening.dialogLabel")}
      >
        <header className="inbox-head">
          <div>
            <p className="eyebrow">
              {step === "language"
                ? t("opening.language.eyebrow")
                : step === "name"
                  ? t("opening.name.eyebrow")
                  : t("opening.story.welcome", { name: displayName })}
            </p>
            <h2>
              {step === "language"
                ? t("opening.language.title")
                : step === "name"
                  ? t("opening.name.title")
                  : t("opening.story.title")}
            </h2>
          </div>
          <p className="opening-step" aria-hidden="true">
            {stepLabel}
          </p>
        </header>

        {step === "language" ? (
          <>
            <p className="opening-lead">{t("opening.language.subtitle")}</p>
            <p className="opening-language-note">{t("opening.language.note")}</p>
            <div className="opening-origin-grid opening-language-grid">
              {LOCALE_OPTIONS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={
                    highlightLocale === entry.id
                      ? "opening-origin-card is-active"
                      : "opening-origin-card"
                  }
                  onClick={() => pickLanguage(entry.id)}
                  onMouseEnter={() => setHighlightLocale(entry.id)}
                >
                  <strong>{entry.nativeLabel}</strong>
                </button>
              ))}
            </div>
          </>
        ) : null}

        {step === "name" ? (
          <form
            className="opening-name"
            onSubmit={(event) => {
              event.preventDefault();
              submitName();
            }}
          >
            <p className="opening-lead">{t("opening.name.lead")}</p>
            <label className="opening-name-field">
              <span>{t("opening.name.label")}</span>
              <input
                ref={nameInputRef}
                type="text"
                name="managerName"
                autoComplete="nickname"
                maxLength={MANAGER_NAME_MAX}
                value={draftName}
                placeholder={t("opening.name.placeholder")}
                aria-label={t("opening.name.label")}
                onChange={(event) => setDraftName(event.target.value)}
              />
            </label>
            <footer className="opening-actions">
              {localeChosen ? (
                <button
                  type="button"
                  className="opening-back-btn"
                  onClick={() => setStep("language")}
                >
                  {t("shell.menu.back")}
                </button>
              ) : null}
              <button type="submit" className="opening-start-btn" disabled={!readyName}>
                {t("opening.name.continue")}
              </button>
            </footer>
          </form>
        ) : null}

        {step === "story" ? (
          <>
            <p className="opening-lead">{t("opening.story.lead")}</p>

            <div className="opening-origin-grid">
              {ORIGIN_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={origin === id ? "opening-origin-card is-active" : "opening-origin-card"}
                  onClick={() => setOrigin(id)}
                >
                  <span className="opening-origin-icon" aria-hidden="true">
                    {id === "raffle" ? "🎟️" : id === "passionate_letter" ? "✉️" : "🏘️"}
                  </span>
                  <strong>{t(`opening.origin.${id}.title`)}</strong>
                  <span>{t(`opening.origin.${id}.hint`)}</span>
                </button>
              ))}
            </div>

            <section className="opening-captain" aria-label={t("opening.captain.title")}>
              <h3>{t("opening.captain.title")}</h3>
              <p className="opening-captain-hint">{t("opening.captain.hint")}</p>
              <ul className="opening-captain-list">
                {candidates.map((candidate) => (
                  <li key={candidate.player.id}>
                    <button
                      type="button"
                      className={
                        captainId === candidate.player.id
                          ? "opening-captain-row is-active"
                          : "opening-captain-row"
                      }
                      onClick={() => setCaptainId(candidate.player.id)}
                    >
                      <span className="opening-captain-stats">
                        <strong>{candidate.label}</strong>
                        <span>
                          {t("opening.captain.leadership", { leadership: candidate.leadership })} ·{" "}
                          {candidate.teamworkHint}
                        </span>
                      </span>
                      <span aria-hidden="true">{captainId === candidate.player.id ? "✓" : "○"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <footer className="opening-actions">
              <button type="button" className="opening-back-btn" onClick={() => setStep("name")}>
                {t("opening.story.changeName")}
              </button>
              <button
                type="button"
                className="opening-start-btn"
                disabled={!captainId || !readyName}
                onClick={() => onComplete(origin, captainId, normalizeManagerName(draftName))}
              >
                {t("opening.story.start")}
              </button>
            </footer>
          </>
        ) : null}
      </div>
    </div>
  );
}
