import type { Player } from "../types/player.ts";

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
