/** Reserved hover band — active + idle layers stacked (no layout swap on hover). */
export function TrainingPixelHoverLine({
  idleLabel,
  activeTitle,
  activeDetail,
}: {
  idleLabel: string;
  activeTitle: string | null;
  activeDetail: string | null;
}) {
  const showActive = activeTitle != null && activeDetail != null;

  return (
    <p className="training-pixel-hover" role="status" aria-live="polite">
      <span
        className={`training-pixel-hover__layer${showActive ? " is-visible" : ""}`}
        aria-hidden={!showActive}
      >
        <strong>{activeTitle ?? "\u00A0"}</strong>
        <span>{activeDetail ?? "\u00A0"}</span>
      </span>
      <span
        className={`training-pixel-hover__layer training-pixel-hover__layer--idle${showActive ? "" : " is-visible"}`}
        aria-hidden={showActive}
      >
        {idleLabel}
      </span>
    </p>
  );
}
