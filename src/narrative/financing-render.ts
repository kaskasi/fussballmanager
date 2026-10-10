import type { StoryCast, StoryInboxPayload } from "./story-state.ts";
import type { FinancingStoryChannelId } from "../economy/financing-channels.ts";

export function financingInboxPayload(
  channelId: FinancingStoryChannelId,
  cast: StoryCast,
): StoryInboxPayload {
  switch (channelId) {
    case "fan_stadium_coop":
      return {
        beatId: channelId,
        title: `${cast.fan_rep_label} · Genossenschaft`,
        body: "Die Kurve will Anteile am Gelände — Einmal-Cash gegen mehr Stimme im Merch.",
        source: "fan",
        choices: [
          { id: "accept", label: "Genossenschaft", icon: "●" },
          { id: "decline", label: "Ablehnen", icon: "▲" },
        ],
      };
    case "loan_shark_instant":
      return {
        beatId: channelId,
        title: "Vorstand · Notfall",
        body: "Ein Vermittler bietet Sofortkredit — extreme Wochenkosten, keine zweite Chance.",
        source: "board",
        choices: [
          { id: "accept", label: "Nehmen", icon: "●" },
          { id: "decline", label: "Ablehnen", icon: "▲" },
        ],
      };
    case "naming_rights_sale":
      return {
        beatId: channelId,
        title: "Vorstand · Namensrecht",
        body: "Sponsor zahlt für den Stadionnamen — Fanbase reagiert empfindlich.",
        source: "board",
        choices: [
          { id: "accept", label: "Verkaufen", icon: "●" },
          { id: "decline", label: "Name behalten", icon: "▲" },
        ],
      };
    case "merch_digi_drop":
      return {
        beatId: channelId,
        title: "Merch · Limited Drop",
        body: "Digitale Sonderedition — begrenzte Auflage, kurzer Umsatz-Schub im Fanshop.",
        source: "board",
        choices: [
          { id: "accept", label: "Drop starten", icon: "●" },
          { id: "decline", label: "Standard", icon: "▲" },
        ],
      };
  }
}
