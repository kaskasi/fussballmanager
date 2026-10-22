/** Developer UI gallery (design.md §4): every design-system component on one page, opened with `?ui=gallery`. */

export const UI_GALLERY_HREF = "?ui=gallery";

export function isUiGalleryUrl(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("ui") === "gallery";
}
