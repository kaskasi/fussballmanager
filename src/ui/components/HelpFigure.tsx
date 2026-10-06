/** WIREFRAME: design.md §9 — help screenshot figure */
import { useT } from "../../i18n/react.ts";

export function HelpFigure({
  src,
  captionKey,
  altKey,
}: {
  src: string;
  captionKey: string;
  altKey: string;
}) {
  const t = useT();
  return (
    <figure className="help-figure">
      <img src={src} alt={t(altKey)} loading="lazy" decoding="async" />
      <figcaption>{t(captionKey)}</figcaption>
    </figure>
  );
}
