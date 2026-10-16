import { useEffect, useState } from "react";
import { PORTRAIT_ACCENT, recolorPortraitSvgShirt } from "./portrait-kit-recolor.ts";

const svgTextByUrl = new Map<string, Promise<string>>();
const blobUrlByKey = new Map<string, string>();

function cacheKey(baseUrl: string, kitPrimary: string): string {
  return `${baseUrl}|${kitPrimary.toLowerCase()}`;
}

function fetchSvgText(url: string): Promise<string> {
  let pending = svgTextByUrl.get(url);
  if (!pending) {
    pending = fetch(url).then((response) => {
      if (!response.ok) {
        throw new Error(`Portrait fetch failed: ${url}`);
      }
      return response.text();
    });
    svgTextByUrl.set(url, pending);
  }
  return pending;
}

/** Returns a display URL (original or kit-recolored blob). */
export function usePortraitKitImage(
  baseUrl: string,
  kitPrimary: string | undefined,
): string {
  const [src, setSrc] = useState(baseUrl);

  useEffect(() => {
    if (!kitPrimary || kitPrimary.toLowerCase() === PORTRAIT_ACCENT.toLowerCase()) {
      setSrc(baseUrl);
      return;
    }

    const key = cacheKey(baseUrl, kitPrimary);
    const cached = blobUrlByKey.get(key);
    if (cached) {
      setSrc(cached);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const svg = recolorPortraitSvgShirt(await fetchSvgText(baseUrl), kitPrimary);
        const blob = new Blob([svg], { type: "image/svg+xml" });
        const objectUrl = URL.createObjectURL(blob);
        blobUrlByKey.set(key, objectUrl);
        if (!cancelled) {
          setSrc(objectUrl);
        }
      } catch {
        if (!cancelled) {
          setSrc(baseUrl);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [baseUrl, kitPrimary]);

  return src;
}
