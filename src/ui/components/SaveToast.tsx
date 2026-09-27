/** Brief save confirmation — auto-dismiss, no persistent chrome. */
export function SaveToast({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="save-toast" role="status" aria-live="polite">
      💾 Gespeichert
    </div>
  );
}
