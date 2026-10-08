/** Dev-only storyboard POC — static panel ids + i18n caption keys (PRD storyboard eval). */

export type StoryboardPocSequenceId =
  | "cold_open"
  | "passionate_letter"
  | "raffle_stub"
  | "community_stub"
  | "full_demo";

export type StoryboardPocFrame = {
  panelId: string;
  captionKey: string;
};

const COLD_OPEN: StoryboardPocFrame[] = [
  { panelId: "co-01-empty-office", captionKey: "storyboard.poc.co01" },
  { panelId: "co-02-empty-bench", captionKey: "storyboard.poc.co02" },
  { panelId: "co-03-fans-waiting", captionKey: "storyboard.poc.co03" },
  { panelId: "co-04-board-table", captionKey: "storyboard.poc.co04" },
  { panelId: "co-05-hook", captionKey: "storyboard.poc.co05" },
];

const PASSIONATE_LETTER: StoryboardPocFrame[] = [
  { panelId: "pl-01-writing", captionKey: "storyboard.poc.pl01" },
  { panelId: "pl-02-envelope", captionKey: "storyboard.poc.pl02" },
  { panelId: "pl-03-board-reads", captionKey: "storyboard.poc.pl03" },
  { panelId: "pl-04-hired", captionKey: "storyboard.poc.pl04" },
  { panelId: "pl-05-sideline", captionKey: "storyboard.poc.pl05" },
  { panelId: "pl-06-start", captionKey: "storyboard.poc.pl06" },
];

const RAFFLE_STUB: StoryboardPocFrame[] = [
  { panelId: "rf-01-draw", captionKey: "storyboard.poc.rf01" },
  { panelId: "rf-02-surprise", captionKey: "storyboard.poc.rf02" },
];

const COMMUNITY_STUB: StoryboardPocFrame[] = [
  { panelId: "cm-01-crowd", captionKey: "storyboard.poc.cm01" },
  { panelId: "cm-02-phone", captionKey: "storyboard.poc.cm02" },
];

export const STORYBOARD_POC_SEQUENCES: Record<
  StoryboardPocSequenceId,
  { labelKey: string; frames: StoryboardPocFrame[] }
> = {
  cold_open: { labelKey: "storyboard.poc.seq.coldOpen", frames: COLD_OPEN },
  passionate_letter: {
    labelKey: "storyboard.poc.seq.letter",
    frames: [...COLD_OPEN, ...PASSIONATE_LETTER],
  },
  raffle_stub: { labelKey: "storyboard.poc.seq.raffle", frames: [...COLD_OPEN, ...RAFFLE_STUB] },
  community_stub: {
    labelKey: "storyboard.poc.seq.community",
    frames: [...COLD_OPEN, ...COMMUNITY_STUB],
  },
  full_demo: {
    labelKey: "storyboard.poc.seq.full",
    frames: [
      ...COLD_OPEN,
      ...PASSIONATE_LETTER,
      ...RAFFLE_STUB.slice(0, 1),
      ...COMMUNITY_STUB.slice(0, 1),
    ],
  },
};

export function storyboardPocPanelUrl(panelId: string): string {
  return `/assets/storyboard-poc/panels/${panelId}.svg`;
}
