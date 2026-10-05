/**
 * WIREFRAME: docs/prd/design.md §9.9 — full club events list (Alle)
 */
import type { ClubEvent } from "../../inbox/club-events.ts";
import { clubEventIcon } from "../../inbox/club-events.ts";
import { formatCalendarWeekDisplay } from "../../i18n/calendar-display.ts";
import { useT } from "../../i18n/react.ts";
import { t } from "../../i18n/index.ts";

export function ClubEventsScreen({
  events,
  onBack,
}: {
  events: readonly ClubEvent[];
  onBack: () => void;
}) {
  useT();
  return (
    <main className="screen-shell">
      <header className="screen-title-row">
        <div>
          <button type="button" className="screen-back-link" onClick={onBack}>
            {t("shell.menu.back")}
          </button>
          <h1>{t("hub.events.screenTitle")}</h1>
        </div>
      </header>
      {events.length === 0 ? (
        <p className="hub-inbox-empty">{t("hub.inbox.eventsEmpty")}</p>
      ) : (
        <ul className="hub-inbox-list hub-events-full-list">
          {events.map((event) => (
            <li key={event.id}>
              <div className="hub-inbox-event">
                <span className="hub-inbox-icon" aria-hidden="true">
                  {clubEventIcon(event.kind)}
                </span>
                <span className="hub-inbox-event-message">{event.message}</span>
                <span className="hub-inbox-event-meta">{formatCalendarWeekDisplay(event.week)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
