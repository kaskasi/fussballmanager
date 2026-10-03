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

const ORIGINS: Array<{ id: CareerOrigin; icon: string; title: string; hint: string }> = [
  {
    id: "raffle",
    icon: "🎟️",
    title: "Losgewinn",
    hint: "Der Fanverein zog deinen Namen — plötzlich bist du Trainer.",
  },
  {
    id: "passionate_letter",
    icon: "✉️",
    title: "Der Brief",
    hint: "Du hast geschrieben, was du fühlst. Der Vorstand hat zugehört.",
  },
  {
    id: "community_takeover",
    icon: "🏘️",
    title: "Gemeinschaft",
    hint: "Niemand wollte den Job. Der Verein gehört euch — also machst du es.",
  },
];

type OpeningStep = "name" | "story";

function initialDraftName(managerName: string): string {
  if (!managerName || PLACEHOLDER_MANAGER_NAMES.has(managerName)) return "";
  return managerName;
}

/**
 * WIREFRAME: PRD 13 — Career opening
 *
 *  1) 🪪 Wie heißt du?
 *  2) Origin-Karten + Kapitän
 */
export function OpeningStoryModal({
  managerName,
  players,
  clubId,
  onComplete,
}: {
  managerName: string;
  players: readonly Player[];
  clubId: string;
  onComplete: (origin: CareerOrigin, captainPlayerId: string, managerName: string) => void;
}) {
  const [draftName, setDraftName] = useState(() => initialDraftName(managerName));
  const [step, setStep] = useState<OpeningStep>(() =>
    isManagerNameReady(initialDraftName(managerName)) ? "story" : "name",
  );
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

  return (
    <div className="inbox-backdrop" role="presentation">
      <div
        className="inbox-modal opening-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Karrierebeginn"
      >
        <header className="inbox-head">
          <div>
            <p className="eyebrow">{step === "name" ? "Karriere" : `Willkommen, ${displayName}`}</p>
            <h2>{step === "name" ? "Wie heißt du?" : "Wie wurdest du Trainer?"}</h2>
          </div>
          <p className="opening-step" aria-hidden="true">
            {step === "name" ? "1 / 2" : "2 / 2"}
          </p>
        </header>

        {step === "name" ? (
          <form
            className="opening-name"
            onSubmit={(event) => {
              event.preventDefault();
              submitName();
            }}
          >
            <p className="opening-lead">Dein Name steht in der Chronik und auf dem Spielstand.</p>
            <label className="opening-name-field">
              <span>Name</span>
              <input
                ref={nameInputRef}
                type="text"
                name="managerName"
                autoComplete="nickname"
                maxLength={MANAGER_NAME_MAX}
                value={draftName}
                placeholder="z. B. Kim"
                aria-label="Dein Name"
                onChange={(event) => setDraftName(event.target.value)}
              />
            </label>
            <footer className="opening-actions">
              <button type="submit" className="opening-start-btn" disabled={!readyName}>
                Weiter
              </button>
            </footer>
          </form>
        ) : (
          <>
            <p className="opening-lead">
              Der Verein braucht jemanden. Nicht einen Star — einen Menschen aus der Gegend.
            </p>

            <div className="opening-origin-grid">
              {ORIGINS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={origin === entry.id ? "opening-origin-card is-active" : "opening-origin-card"}
                  onClick={() => setOrigin(entry.id)}
                >
                  <span className="opening-origin-icon" aria-hidden="true">
                    {entry.icon}
                  </span>
                  <strong>{entry.title}</strong>
                  <span>{entry.hint}</span>
                </button>
              ))}
            </div>

            <section className="opening-captain" aria-label="Kapitän wählen">
              <h3>©️ Kapitän wählen</h3>
              <p className="opening-captain-hint">Sortiert nach Leadership — Teamwork als Hinweis.</p>
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
                          Führung {candidate.leadership} · {candidate.teamworkHint}
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
                Name ändern
              </button>
              <button
                type="button"
                className="opening-start-btn"
                disabled={!captainId || !readyName}
                onClick={() => onComplete(origin, captainId, normalizeManagerName(draftName))}
              >
                Saison beginnen
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
