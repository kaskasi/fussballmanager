import { localizeFanFeedBeat } from "../../i18n/story-display.ts";
import { useT } from "../../i18n/react.ts";
import { t } from "../../i18n/index.ts";
import type { FanFeedBeat, StoryCast } from "../../narrative/story-state.ts";

/**
 * WIREFRAME: PRD 09 / PRD 13 — Fan mood header strip (F9.3)
 */
export function FanFeedStrip({
  fanFeed,
  mediaHype,
  storyCast,
}: {
  fanFeed: readonly FanFeedBeat[];
  mediaHype: number;
  storyCast: StoryCast;
}) {
  useT();
  const recent = fanFeed.slice(0, 3);
  if (recent.length === 0) return null;

  return (
    <section className="fan-feed-strip" aria-label={t("story.fan.strip.aria")}>
      <span className="fan-feed-label" aria-hidden="true">👥</span>
      <ul className="fan-feed-chips">
        {recent.map((beat) => {
          const localized = localizeFanFeedBeat(beat, storyCast);
          return (
          <li key={beat.id} className="fan-feed-chip" title={`${localized.speaker}: ${localized.message}`}>
            <span aria-hidden="true">{beat.icon}</span>
            <span className="fan-feed-chip-text">{localized.message}</span>
          </li>
          );
        })}
      </ul>
      <span className="fan-feed-hype" title={t("story.fan.hypeTitle")}>
        📰 {mediaHype}
      </span>
    </section>
  );
}
