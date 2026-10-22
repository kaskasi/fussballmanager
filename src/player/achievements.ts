import type { Player } from "../types/player.ts";
import { t } from "../i18n/index.ts";

/** Display labels stored in `player.history.achievements`. */
export const ACHIEVEMENT = {
  youthTopForm: "🚀 Top-Form in der Jugend",
  youthHeavyMinutes: "⚽ Dauereinsatz in der Jugend",
  promotedU19: "⬆️ Aufstieg in die U19",
  promotedPro: "⭐ Profikader",
  proTrialWeek: "🏃 Probewoche im Profiteam",
  contractSigned: "✍️ Profivertrag unterschrieben",
  loanMove: "🔄 Ausleihe mit Spielzeit-Garantie",
  trainingFocus: "💪 Individueller Trainingsfokus",
} as const;

export type AchievementLabel = (typeof ACHIEVEMENT)[keyof typeof ACHIEVEMENT];

/** Saves store the German label (with its icon); the UI shows the translated name without the emoji. */
export function achievementDisplayLabel(stored: string): string {
  const id = (Object.keys(ACHIEVEMENT) as (keyof typeof ACHIEVEMENT)[]).find((key) => ACHIEVEMENT[key] === stored);
  if (id) return t(`player.achievement.${id}`);
  return stored.replace(/^[^\p{L}\p{N}]+/u, "");
}

export function grantAchievement(player: Player, badge: AchievementLabel): Player {
  if (player.history.achievements.includes(badge)) return player;
  return {
    ...player,
    history: {
      ...player.history,
      achievements: [...player.history.achievements, badge],
    },
  };
}

export function grantAchievements(player: Player, badges: readonly AchievementLabel[]): Player {
  return badges.reduce((current, badge) => grantAchievement(current, badge), player);
}
