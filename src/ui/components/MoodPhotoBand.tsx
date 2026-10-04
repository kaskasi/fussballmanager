import type { ReactNode } from "react";

/** PRD 14 — photo hero with gradient overlay for readable chrome text. */
export function MoodPhotoBand({
  src,
  className,
  children,
}: {
  src: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={className ? `mood-photo-band ${className}` : "mood-photo-band"}
      style={{ ["--mood-photo" as string]: `url(${src})` }}
    >
      <div className="mood-photo-band__scrim" aria-hidden="true" />
      {children ? <div className="mood-photo-band__content">{children}</div> : null}
    </div>
  );
}
