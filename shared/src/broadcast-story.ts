/** Read-only narrative facts for match broadcast director (PRD 16 B4). */

export type BroadcastStoryFanHead = {
  speaker: string;
  message: string;
};

export type BroadcastStoryChronicleHead = {
  title: string;
};

export type BroadcastStoryTable = {
  place: number;
  teams: number;
};

export type BroadcastStoryContext = {
  activeArc?: "relegation_battle" | "promotion_push" | null;
  fanFeedHead?: BroadcastStoryFanHead | null;
  chronicleHead?: BroadcastStoryChronicleHead | null;
  playerTable?: BroadcastStoryTable | null;
  isDerby?: boolean;
  opponentShortName?: string;
};
