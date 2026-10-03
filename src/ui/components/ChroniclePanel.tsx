import type { ChronicleEntry } from "../../narrative/story-state.ts";
import { formatCalendarWeek } from "../../sim/game-calendar.ts";

/**
 * WIREFRAME: PRD 09 / F11.4 — Vereinschronik rail
 */
export function ChroniclePanel({ entries }: { entries: readonly ChronicleEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <section className="chronicle-panel" aria-label="Vereinschronik">
      <header className="chronicle-panel-head">
        <span aria-hidden="true">📜</span>
        <strong>Chronik</strong>
      </header>
      <ul className="chronicle-list">
        {entries.slice(0, 4).map((entry) => (
          <li key={entry.id} className="chronicle-entry">
            <span className="chronicle-icon" aria-hidden="true">{entry.icon}</span>
            <div>
              <strong>{entry.title}</strong>
              <p>{entry.body}</p>
              <span className="chronicle-meta">S{entry.season} · {formatCalendarWeek(entry.week)}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
