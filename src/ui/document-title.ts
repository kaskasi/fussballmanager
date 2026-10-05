import { useEffect } from "react";

/** Sync browser tab title (not in-game navigation). */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

export function joinDocumentTitle(...parts: readonly string[]): string {
  return parts.filter((part) => part.length > 0).join(" · ");
}
