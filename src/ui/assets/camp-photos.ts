/**
 * Camp nation hero surfaces (PRD 20).
 * Default build: CSS gradients only — JPG bake optional for illustrated upgrades.
 * See npm run bake:camp-photos and docs/prd/20_design_language.md.
 */

const CAMP_PHOTO_BY_NATION: Record<string, string> = {
  camp_br: "/assets/photos/camps/camp-br.jpg",
  camp_ng: "/assets/photos/camps/camp-ng.jpg",
  camp_pl: "/assets/photos/camps/camp-pl.jpg",
  camp_fr: "/assets/photos/camps/camp-fr.jpg",
  camp_tr: "/assets/photos/camps/camp-tr.jpg",
  camp_hr: "/assets/photos/camps/camp-hr.jpg",
};

/** Optional illustrated/CC0 hero — off in default build for visual coherence. */
export const CAMP_PHOTO_JPG_ENABLED = false;

export function campPhotoUrl(nationId: string): string | undefined {
  if (!CAMP_PHOTO_JPG_ENABLED) return undefined;
  return CAMP_PHOTO_BY_NATION[nationId];
}

export function campPhotoGradient(nationId: string): string {
  const tones: Record<string, string> = {
    camp_br: "linear-gradient(135deg, var(--rasen-dunkel) 0%, #2d5016 100%)",
    camp_ng: "linear-gradient(135deg, #1a472a 0%, #0f766e 100%)",
    camp_pl: "linear-gradient(135deg, #334155 0%, #64748b 100%)",
    camp_fr: "linear-gradient(135deg, #0369a1 0%, #7c3aed 100%)",
    camp_tr: "linear-gradient(135deg, #b45309 0%, #dc2626 100%)",
    camp_hr: "linear-gradient(135deg, #0e7490 0%, #1d4ed8 100%)",
  };
  return tones[nationId] ?? "linear-gradient(135deg, var(--rasen) 0%, var(--rasen-dunkel) 100%)";
}
