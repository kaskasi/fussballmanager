import { useEffect, useState, type RefObject } from "react";

const TILE_REM = 1.85;
const GAP_REM = 0.12;
const MIN_TILE_REM = 0.82;

function rootFontPx(): number {
  if (typeof document === "undefined") return 16;
  return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
}

export function fitPrecinctTilePx({
  hostWidthPx,
  columns,
  rootFontPx: root,
}: {
  hostWidthPx: number;
  columns: number;
  rootFontPx: number;
}): number {
  if (hostWidthPx <= 0 || columns <= 0) return TILE_REM * root;
  const gapPx = GAP_REM * root;
  const totalGaps = gapPx * Math.max(0, columns - 1);
  const raw = (hostWidthPx - totalGaps) / columns;
  const minPx = MIN_TILE_REM * root;
  const maxPx = TILE_REM * root;
  return Math.max(minPx, Math.min(maxPx, raw));
}

export function defaultPrecinctTilePx(): number {
  return TILE_REM * rootFontPx();
}

/** Fit precinct grid columns to host width on mobile; desktop keeps 1.85rem. */
export function usePrecinctMobileTileSize(
  enabled: boolean,
  hostRef: RefObject<HTMLDivElement | null>,
  columns: number,
): { tileCss: string; tilePx: number } {
  const [tilePx, setTilePx] = useState(defaultPrecinctTilePx);

  useEffect(() => {
    if (!enabled) {
      setTilePx(defaultPrecinctTilePx());
      return;
    }
    const el = hostRef.current;
    if (!el) return;

    const measure = () => {
      const width = el.clientWidth;
      if (width <= 0) return;
      setTilePx(
        fitPrecinctTilePx({ hostWidthPx: width, columns, rootFontPx: rootFontPx() }),
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, columns, hostRef]);

  return {
    tileCss: enabled ? `${tilePx}px` : `${TILE_REM}rem`,
    tilePx,
  };
}
