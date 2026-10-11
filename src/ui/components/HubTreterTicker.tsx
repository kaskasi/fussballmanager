/** WIREFRAME: design.md §9.9 — Desk news ticker (Der Treter headlines) */
import { useT } from "../../i18n/react.ts";

export function HubTreterTicker({ lines }: { lines: readonly string[] }) {
  const t = useT();
  if (lines.length === 0) return null;

  const segment = lines.join("  ·  ");

  return (
    <div className="hub-desk-ticker" role="marquee" aria-label={t("hub.desk.ticker.aria")}>
      <div className="hub-desk-ticker__label">{t("hub.desk.ticker.label")}</div>
      <div className="hub-desk-ticker__viewport">
        <div className="hub-desk-ticker__track">
          <span className="hub-desk-ticker__text">{segment}</span>
          <span className="hub-desk-ticker__text" aria-hidden>
            {segment}
          </span>
        </div>
      </div>
    </div>
  );
}
