import { useState } from "react";
import type { CareerOrigin } from "../../narrative/story-state.ts";
import { leadershipCandidates } from "../../narrative/captain.ts";
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

/**
 * WIREFRAME: PRD 13 — Career opening (Stardew-slow start)
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
  onComplete: (origin: CareerOrigin, captainPlayerId: string) => void;
}) {
  const [origin, setOrigin] = useState<CareerOrigin>("community_takeover");
  const candidates = leadershipCandidates(players, clubId);
  const [captainId, setCaptainId] = useState(candidates[0]?.player.id ?? "");

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
            <p className="eyebrow">Willkommen, {managerName}</p>
            <h2>Wie wurdest du Trainer?</h2>
          </div>
        </header>

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
              <span className="opening-origin-icon" aria-hidden="true">{entry.icon}</span>
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
          <button
            type="button"
            className="opening-start-btn"
            disabled={!captainId}
            onClick={() => onComplete(origin, captainId)}
          >
            Saison beginnen
          </button>
        </footer>
      </div>
    </div>
  );
}
