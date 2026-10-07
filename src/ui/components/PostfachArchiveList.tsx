/** WIREFRAME: design.md §9.4 — Postfach-Archiv (Textliste) */
import { useEffect, useMemo, useState } from "react";
import {
  POSTFACH_ARCHIVE_PAGE_SIZE,
  paginateArchiveEntries,
  type PostfachArchiveEntry,
} from "../../inbox/postfach-archive.ts";
import { formatCalendarWeekDisplay } from "../../i18n/calendar-display.ts";
import { useT } from "../../i18n/react.ts";

export function PostfachArchiveList({
  entries,
}: {
  entries: readonly PostfachArchiveEntry[];
}) {
  const t = useT();
  const totalPages = Math.max(1, Math.ceil(entries.length / POSTFACH_ARCHIVE_PAGE_SIZE));
  const [page, setPage] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages - 1));
  }, [totalPages]);

  const pageEntries = useMemo(
    () => paginateArchiveEntries(entries, page),
    [entries, page],
  );

  const active = activeId ? pageEntries.find((entry) => entry.id === activeId) : null;

  const goToPage = (nextPage: number) => {
    setActiveId(null);
    setPage(Math.max(0, Math.min(nextPage, totalPages - 1)));
  };

  if (entries.length === 0) {
    return <p className="postfach-archive-empty">{t("postfach.archive.empty")}</p>;
  }

  return (
    <section className="postfach-archive game-panel" aria-label={t("postfach.archive.aria")}>
      <h3 className="postfach-archive-title">{t("postfach.archive.title")}</h3>
      <ul
        key={`archive-page-${page}`}
        className="postfach-archive-list"
        data-archive-page={page + 1}
        data-archive-rows={pageEntries.length}
      >
        {pageEntries.map((entry, index) => (
          <li key={`${page}-${entry.id}-${index}`}>
            <button
              type="button"
              className={entry.id === activeId ? "postfach-archive-row is-active" : "postfach-archive-row"}
              onClick={() => setActiveId(entry.id)}
            >
              <span className="postfach-archive-row-week">
                {entry.season > 0
                  ? formatCalendarWeekDisplay(entry.week)
                  : t("postfach.archive.week", { week: entry.week })}
              </span>
              <span className="postfach-archive-row-text">
                <span className="postfach-archive-row-line">{entry.title}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {active && active.detail ? <p className="postfach-archive-detail">{active.detail}</p> : null}
      {totalPages > 1 ? (
        <nav className="postfach-archive-pagination" aria-label={t("postfach.archive.pagination")}>
          {Array.from({ length: totalPages }, (_, index) => (
            <button
              key={index}
              type="button"
              className={index === page ? "postfach-archive-page is-active" : "postfach-archive-page"}
              aria-current={index === page ? "page" : undefined}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                goToPage(index);
              }}
            >
              {index + 1}
            </button>
          ))}
        </nav>
      ) : null}
    </section>
  );
}
