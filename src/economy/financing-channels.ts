export const FINANCING_STORY_CHANNELS = [
  "fan_stadium_coop",
  "loan_shark_instant",
  "naming_rights_sale",
  "merch_digi_drop",
] as const;

export type FinancingStoryChannelId = (typeof FINANCING_STORY_CHANNELS)[number];

export function isFinancingStoryChannel(beatId: string): beatId is FinancingStoryChannelId {
  return (FINANCING_STORY_CHANNELS as readonly string[]).includes(beatId);
}
