import { useT } from "../../i18n/react.ts";

/** Persistent warning when disk persist failed but in-memory state advanced. */
export function SaveDirtyBanner({
  visible,
  onExport,
}: {
  visible: boolean;
  onExport: () => void;
}) {
  const t = useT();
  if (!visible) return null;
  return (
    <div className="save-dirty-banner" role="alert">
      <p>{t("shell.saveDirtyBanner")}</p>
      <button type="button" className="save-dirty-banner__action" onClick={onExport}>
        {t("shell.saveDirtyExport")}
      </button>
    </div>
  );
}

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
