import type { SeasonAwardsSnapshot } from "../../sim/season-awards.ts";
import { Hint } from "./Hint.tsx";

/**
 * WIREFRAME: PRD F11.2 — Saison-Awards
 *
 * ┌────────────────────────────────────────────┐
 * │ 🏆 Saison-Awards · Saison 3                 │
 * │ [⚽ Torschützenkönig] [🅰️ Assist-König] …   │
 * └────────────────────────────────────────────┘
 */

export function SeasonAwardsGallery({ snapshot }: { snapshot: SeasonAwardsSnapshot }) {
  if (snapshot.awards.length === 0) return null;

  return (
    <section className="season-awards" aria-label={`Saison-Awards ${snapshot.season}`}>
      <header className="season-awards-head">
        <h3>🏆 Saison-Awards · Saison {snapshot.season}</h3>
      </header>
      <Hint text="Liga-Auszeichnungen der abgeschlossenen Saison — Karten statt Zahlenwand." block>
        <div className="season-awards-grid">
          {snapshot.awards.map((award) => (
            <article key={award.kind} className="season-award-card">
              <span className="season-award-icon" aria-hidden="true">{award.icon}</span>
              <p className="season-award-title">{award.title}</p>
              <p className="season-award-player">{award.playerName}</p>
              <p className="season-award-club">{award.clubLabel}</p>
              <p className="season-award-value">{award.valueLabel}</p>
            </article>
          ))}
        </div>
      </Hint>
    </section>
  );
}
