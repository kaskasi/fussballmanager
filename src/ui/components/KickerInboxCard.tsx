/** WIREFRAME: PRD 09 — «Der Treter» (Dienstags-Zeitung) im Postfach */
import { Newspaper } from "lucide-react";
import type { TreterArticle, TreterEdition } from "../../media/kicker-digest.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";

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
}: {
  edition: TreterEdition;
  postIndex: number;
  postTotal: number;
  onDismiss?: () => void;
  onSelectPlayer?: (playerId: string) => void;
  compact?: boolean;
  readOnly?: boolean;
}) {
  useT();

  return (
    <section className={compact ? "inbox-detail inbox-treter-inline" : "inbox-card inbox-card-treter"}>
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
