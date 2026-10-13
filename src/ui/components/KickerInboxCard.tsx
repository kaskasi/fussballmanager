/** WIREFRAME: PRD 09 — «Der Treter» (Dienstags-Zeitung) im Postfach */
import { Newspaper } from "lucide-react";
import type { TreterArticle, TreterEdition } from "../../media/kicker-digest.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import { COACH_TARGET } from "../../tutorial/tutorial-targets.ts";

function TreterArticleBlock({
  article,
  onSelectPlayer,
}: {
  article: TreterArticle;
  onSelectPlayer?: (playerId: string) => void;
}) {
  const isHero = article.layout === "hero";
  const content = (
    <>
      {article.imageSrc ? (
        <figure className={isHero ? "treter-figure treter-figure-hero" : "treter-figure"}>
          <img src={article.imageSrc} alt={article.imageAlt ?? ""} loading="lazy" />
        </figure>
      ) : null}
      <div className="treter-article-copy">
        {article.kicker ? <p className="treter-kicker">{article.kicker}</p> : null}
        <h3 className="treter-headline">{article.headline}</h3>
        <p className="treter-body">{article.body}</p>
      </div>
    </>
  );

  if (article.playerId && onSelectPlayer) {
    return (
      <button
        type="button"
        className={isHero ? "treter-article treter-article-hero" : "treter-article"}
        onClick={() => onSelectPlayer(article.playerId!)}
      >
        {content}
      </button>
    );
  }

  return (
    <article className={isHero ? "treter-article treter-article-hero" : "treter-article"}>{content}</article>
  );
}

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

  return (
    <section
      className={compact ? "inbox-detail inbox-treter-inline" : "inbox-card inbox-card-treter"}
      data-coach-target={COACH_TARGET.postfachTreter}
    >
      <div className="inbox-story treter-newspaper">
        {!compact ? (
          <p className="inbox-post-count">
            {t("postfach.scoutJob.postCount", { index: postIndex, total: postTotal })}
          </p>
        ) : null}
        <header className="treter-masthead">
          <Newspaper size={20} aria-hidden />
          <div>
            <strong>{t("postfach.treter.title")}</strong>
            <p>{edition.masthead}</p>
          </div>
        </header>
        <div className="treter-sheet">
          <div className="treter-main">
            {edition.articles.length === 0 ? (
              <p className="inbox-treter-empty">{t("postfach.treter.empty")}</p>
            ) : (
              <div className="treter-grid" aria-label={t("postfach.treter.gridAria")}>
                {edition.articles.map((article) => (
                  <TreterArticleBlock
                    key={article.id}
                    article={article}
                    onSelectPlayer={onSelectPlayer}
                  />
                ))}
              </div>
            )}
          </div>
          <aside className="treter-league-panel" aria-label={t("postfach.treter.leaguePanelAria")}>
            <section className="treter-league-block">
              <h3 className="treter-league-title">{t("postfach.treter.tableTitle")}</h3>
              {league.table.length ? (
                <table className="treter-league-table">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">{t("postfach.treter.colClub")}</th>
                      <th scope="col">{t("postfach.treter.colPlayed")}</th>
                      <th scope="col">{t("postfach.treter.colPoints")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {league.table.map((row) => (
                      <tr
                        key={`${row.rank}-${row.name}`}
                        className={row.isPlayerClub ? "is-own-club" : undefined}
                      >
                        <td>{row.rank}</td>
                        <td>{row.name}</td>
                        <td>{row.played}</td>
                        <td>{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="treter-league-empty">{t("postfach.treter.noTableYet")}</p>
              )}
            </section>
            <section className="treter-league-block">
              <h3 className="treter-league-title">{t("postfach.treter.scorersTitle")}</h3>
              {league.scorers.length ? (
                <ol className="treter-scorer-list">
                  {league.scorers.map((row) => (
                    <li key={`${row.rank}-${row.name}`}>
                      <span className="treter-scorer-name">{row.name}</span>
                      <span className="treter-scorer-goals">{row.goals}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="treter-league-empty">{t("postfach.treter.noScorersYet")}</p>
              )}
            </section>
            {league.matchdaysPlayed ? (
              <p className="treter-league-meta">
                {t("postfach.treter.matchdaysPlayed", {
                  count: league.matchdaysPlayed,
                })}
              </p>
            ) : null}
          </aside>
        </div>
        <p className="treter-photo-note">{t("postfach.treter.photoTodo")}</p>
      </div>
      {!readOnly && onDismiss ? (
        <div className="inbox-actions">
          <button type="button" className="inbox-action" onClick={onDismiss}>
            {t("postfach.treter.dismiss")}
          </button>
        </div>
      ) : null}
    </section>
  );
}
