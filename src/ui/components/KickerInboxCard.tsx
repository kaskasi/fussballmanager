/** WIREFRAME: PRD 09 — «Der Treter» (Dienstags-Zeitung) im Postfach */
import { Newspaper } from "lucide-react";
import type {
  TreterArticle,
  TreterEdition,
  TreterTableRow as TreterTableRowData,
} from "../../media/kicker-digest.ts";
import { formatCalendarWeekDisplay } from "../../i18n/calendar-display.ts";
import { formatSeasonLabel } from "../../sim/season-label.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import { COACH_TARGET } from "../../tutorial/tutorial-targets.ts";

export function KickerInboxCard({
  edition,
  postIndex,
  postTotal,
  onDismiss,
  onSelectPlayer,
  compact = false,
  readOnly = false,
  hubTeaser = false,
  onOpenFullPostfach,
}: {
  edition: TreterEdition;
  postIndex: number;
  postTotal: number;
  onDismiss?: () => void;
  onSelectPlayer?: (playerId: string) => void;
  compact?: boolean;
  readOnly?: boolean;
  /** Manager Desk: headlines only; full edition in Postfach screen. */
  hubTeaser?: boolean;
  onOpenFullPostfach?: () => void;
}) {
  useT();
  const league = edition.league ?? { matchdaysPlayed: 0, table: [], scorers: [] };

  if (hubTeaser) {
    return (
      <section className="inbox-detail inbox-treter-hub-teaser">
        <header className="treter-masthead treter-masthead--compact">
          <Newspaper size={18} aria-hidden />
          <div>
            <strong>{t("postfach.treter.title")}</strong>
            {edition.masthead ? <p>{edition.masthead}</p> : null}
          </div>
        </header>
        {edition.articles.length === 0 ? (
          <p className="inbox-treter-empty">{t("postfach.treter.empty")}</p>
        ) : (
          <ul className="inbox-treter-headline-list" aria-label={t("postfach.treter.gridAria")}>
            {edition.articles.map((article) => (
              <li key={article.id}>{article.headline}</li>
            ))}
          </ul>
        )}
        <div className="inbox-actions inbox-actions--hub-treter">
          {onOpenFullPostfach ? (
            <button type="button" className="hub-events-all-link" onClick={onOpenFullPostfach}>
              {t("hub.inbox.treterOpenPostfach")}
            </button>
          ) : null}
          {onDismiss ? (
            <button type="button" className="inbox-action" onClick={onDismiss}>
              {t("postfach.treter.dismiss")}
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  const [lead, ...more] = leadFirst(edition.articles);
  const ownRow = league.table.find((row) => row.isPlayerClub);
  const tableRows = league.table.slice(0, TABLE_ROWS);

  return (
    <section
      className={compact ? "tc-treter tc-treter--inline" : "tc-treter"}
      data-coach-target={COACH_TARGET.postfachTreter}
    >
      {!compact ? (
        <p className="tc-label">{t("postfach.scoutJob.postCount", { index: postIndex, total: postTotal })}</p>
      ) : null}
      <article className="tc-news" aria-label={t("postfach.treter.title")}>
        <h2 className="tc-news__masthead">{t("postfach.treter.title")}</h2>
        <div className="tc-news__dateline">
          <span>
            {t("postfach.treter.dateline", {
              week: formatCalendarWeekDisplay(edition.week),
              season: formatSeasonLabel(edition.season),
            })}
          </span>
          {league.matchdaysPlayed ? (
            <span>{t("postfach.treter.matchdaysPlayed", { count: league.matchdaysPlayed })}</span>
          ) : null}
          <span>{t("postfach.treter.price")}</span>
        </div>
        <div className="tc-news__grid">
          <div className="tc-treter__main" aria-label={t("postfach.treter.gridAria")}>
            {lead ? (
              <TreterStory article={lead} lead onSelectPlayer={onSelectPlayer} />
            ) : (
              <p className="tc-news__deck">{t("postfach.treter.empty")}</p>
            )}
            {more.length > 0 ? (
              <div className="tc-treter__more">
                {more.map((article) => (
                  <TreterStory key={article.id} article={article} onSelectPlayer={onSelectPlayer} />
                ))}
              </div>
            ) : null}
          </div>
          <aside className="tc-news__side" aria-label={t("postfach.treter.leaguePanelAria")}>
            <div>
              <h3 className="tc-news__side-title">{t("postfach.treter.tableTitle")}</h3>
              {tableRows.length ? (
                <table className="tc-news__table">
                  <tbody>
                    {tableRows.map((row) => (
                      <TreterTableRow key={`${row.rank}-${row.name}`} row={row} />
                    ))}
                    {ownRow && !tableRows.includes(ownRow) ? <TreterTableRow row={ownRow} /> : null}
                  </tbody>
                </table>
              ) : (
                <p>{t("postfach.treter.noTableYet")}</p>
              )}
            </div>
            <div>
              <h3 className="tc-news__side-title">{t("postfach.treter.scorersTitle")}</h3>
              {league.scorers.length ? (
                <table className="tc-news__table">
                  <tbody>
                    {league.scorers.slice(0, SCORER_ROWS).map((row) => (
                      <tr key={`${row.rank}-${row.name}`}>
                        <td>
                          {row.rank} {row.name}
                        </td>
                        <td>{row.goals}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>{t("postfach.treter.noScorersYet")}</p>
              )}
            </div>
          </aside>
        </div>
      </article>
      {!readOnly && onDismiss ? (
        <div className="tc-treter__actions">
          <button type="button" className="tc-btn tc-btn--primary" onClick={onDismiss}>
            {t("postfach.treter.dismiss")}
          </button>
        </div>
      ) : null}
    </section>
  );
}

const TABLE_ROWS = 6;
const SCORER_ROWS = 5;

/** Hero article first, then the rest in edition order. */
function leadFirst(articles: readonly TreterArticle[]): TreterArticle[] {
  const hero = articles.find((article) => article.layout === "hero") ?? articles[0];
  if (!hero) return [];
  return [hero, ...articles.filter((article) => article !== hero)];
}

function TreterTableRow({ row }: { row: TreterTableRowData }) {
  return (
    <tr className={row.isPlayerClub ? "is-us" : undefined}>
      <td>
        {row.rank} {row.name}
      </td>
      <td>{row.points}</td>
    </tr>
  );
}

function TreterStory({
  article,
  lead = false,
  onSelectPlayer,
}: {
  article: TreterArticle;
  lead?: boolean;
  onSelectPlayer?: (playerId: string) => void;
}) {
  const headline =
    article.playerId && onSelectPlayer ? (
      <button type="button" className="tc-treter__headline-link" onClick={() => onSelectPlayer(article.playerId!)}>
        {article.headline}
      </button>
    ) : (
      article.headline
    );
  return (
    <section className={lead ? "tc-treter__story tc-treter__story--lead" : "tc-treter__story"}>
      {article.kicker ? <p className="tc-news__kicker">{article.kicker}</p> : null}
      {lead ? <h3 className="tc-news__headline">{headline}</h3> : <h4 className="tc-treter__headline">{headline}</h4>}
      {lead && article.imageSrc ? (
        <figure className="tc-treter__figure">
          <img src={article.imageSrc} alt={article.imageAlt ?? ""} loading="lazy" />
        </figure>
      ) : null}
      {lead ? (
        <div className="tc-news__cols">
          <p>{article.body}</p>
        </div>
      ) : (
        <p className="tc-treter__body">{article.body}</p>
      )}
    </section>
  );
}
