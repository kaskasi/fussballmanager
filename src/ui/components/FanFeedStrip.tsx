import type { FanFeedBeat } from "../../narrative/story-state.ts";

/**
 * WIREFRAME: PRD 09 / PRD 13 — Fan mood header strip (F9.3)
 */
export function FanFeedStrip({
  fanFeed,
  mediaHype,
}: {
  fanFeed: readonly FanFeedBeat[];
  mediaHype: number;
}) {
  const recent = fanFeed.slice(0, 3);
  if (recent.length === 0) return null;

  return (
    <section className="fan-feed-strip" aria-label="Fan-Stimmung">
      <span className="fan-feed-label" aria-hidden="true">👥</span>
      <ul className="fan-feed-chips">
        {recent.map((beat) => (
          <li key={beat.id} className="fan-feed-chip" title={`${beat.speaker}: ${beat.message}`}>
            <span aria-hidden="true">{beat.icon}</span>
            <span className="fan-feed-chip-text">{beat.message}</span>
          </li>
        ))}
      </ul>
      <span className="fan-feed-hype" title="Medienhype">
        📰 {mediaHype}
      </span>
    </section>
  );
}
