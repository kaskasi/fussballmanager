/** Kit fixtures for the UI gallery title bar samples: one per branch of titleBarColors. */
import { PLAYER_CLUB_KIT_PRIMARY, PLAYER_CLUB_KIT_SECONDARY } from "../../world/club-kit.ts";
import type { KitColors } from "../shell/title-bar-colors.ts";

export const SAMPLE_KITS: readonly { name: string; initials: string; kit: KitColors }[] = [
  { name: "Kieler FC", initials: "KFC", kit: { primary: PLAYER_CLUB_KIT_PRIMARY, secondary: PLAYER_CLUB_KIT_SECONDARY } },
  { name: "SC Lübeck", initials: "SCL", kit: { primary: "#1d3a8a", secondary: "#0f1f4d" } },
  { name: "Fortuna Husum Nord", initials: "FHN", kit: { primary: "#f2c500", secondary: "#1d3a8a" } },
  { name: "VfB Flensburg", initials: "VFB", kit: { primary: "#ffffff", secondary: "#c8102e" } },
  { name: "TSV Pinneberg Nord", initials: "TSV", kit: { primary: "#111111", secondary: "#e2e2e2" } },
  { name: "Holstein Rendsburg", initials: "HR", kit: { primary: "#e0503a", secondary: "#7a1d12" } },
  { name: "SV Goldgelb", initials: "SVG", kit: { primary: "#ffd000", secondary: "#f5c400" } },
];
