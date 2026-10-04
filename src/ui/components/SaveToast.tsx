/** Brief save confirmation — auto-dismiss, no persistent chrome. */

export function SaveToast({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="save-toast" role="status" aria-live="polite">
      💾 Gespeichert
    </div>
  );
}

/** Unmissable action result — especially transfer blocks. */
export function NoticeToast({
  message,
  tone = "ok",
}: {
  message: string | null;
  tone?: "ok" | "warn";
}) {
  if (!message) return null;
  return (
    <div
      className={tone === "warn" ? "save-toast is-warn" : "save-toast"}
      role="status"
      aria-live="assertive"
    >
      {message}
    </div>
  );
}
