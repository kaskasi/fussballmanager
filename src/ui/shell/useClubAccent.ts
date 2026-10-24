import { useEffect, useMemo } from "react";
import { clubAccentColors, type ClubAccentColors } from "./club-accent-colors.ts";
import type { KitColors } from "./title-bar-colors.ts";

const ACCENT_PROPERTIES: Record<keyof ClubAccentColors, string> = {
  accent: "--accent",
  accentStrong: "--accent-strong",
  accentSoft: "--accent-soft",
  onAccent: "--on-accent",
};

/**
 * Sets the --accent family from the club kit on <html>. It has to be the root: the
 * legacy aliases (--rasen-dunkel, --rasen-hell …) resolve there, and portals sit under <body>.
 */
export function useClubAccent(kit: KitColors | null | undefined): void {
  const primary = kit?.primary;
  const secondary = kit?.secondary;
  const colors = useMemo(
    () => (primary !== undefined && secondary !== undefined ? clubAccentColors({ primary, secondary }) : null),
    [primary, secondary],
  );

  useEffect(() => {
    if (!colors) return;
    const style = document.documentElement.style;
    const entries = Object.entries(ACCENT_PROPERTIES) as [keyof ClubAccentColors, string][];
    for (const [key, property] of entries) style.setProperty(property, colors[key]);
    return () => {
      for (const [, property] of entries) style.removeProperty(property);
    };
  }, [colors]);
}
