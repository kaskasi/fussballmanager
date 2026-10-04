import type { CareerOrigin, StoryCast, StoryInboxPayload } from "./story-state.ts";
import { formatPlayerName } from "../types/player-display.ts";
import type { Player } from "../types/player.ts";

export function originOpeningBody(origin: CareerOrigin, managerName: string): string {
  switch (origin) {
    case "raffle":
      return `Niemand wollte den Job. Dann gewann ${managerName} die Losverlosung des Fanvereins — und steht plötzlich an der Seitenlinie.`;
    case "passionate_letter":
      return `${managerName} schrieb einen Brief wie 2004 — nur ohne WM-Titel. Der Vorstand las ihn trotzdem. Jetzt bist du Trainer.`;
    case "community_takeover":
      return `Der Verein gehört der Gemeinde. Als kein Profi-Coach zusagte, rief der Fanrat ${managerName} ans Telefon.`;
  }
}

export function originChronicleTitle(origin: CareerOrigin): string {
  switch (origin) {
    case "raffle":
      return "Der Losgewinn";
    case "passionate_letter":
      return "Der Brief";
    case "community_takeover":
      return "Gemeinschaft übernimmt";
  }
}

export function captainPickBody(captain: Player): string {
  return `${formatPlayerName(captain)} führt die Kabine. Die Mannschaft schaut zu dir — und zu ihm.`;
}

export function fanFeedMessage(
  beatId: string,
  cast: StoryCast,
  context: { opponent?: string; streak?: number },
): { speaker: string; icon: string; message: string } {
  switch (beatId) {
    case "fan_worry_loss_streak":
      return {
        speaker: cast.bratwurst_vendor_name,
        icon: "🌭",
        message: `Drei Niederlagen? Ich verkauf weniger Bratwurst — und die Kurve wird still.`,
      };
    case "fan_hope_unbeaten":
      return {
        speaker: cast.fan_rep_label,
        icon: "📣",
        message: "Unbesiegt! So klingt unser Verein wieder.",
      };
    case "fan_ticket_backlash":
      return {
        speaker: cast.fan_rep_label,
        icon: "🎟️",
        message: "Die Tickets sind zu teuer. Wir sind da — aber nicht zum Spaß.",
      };
    case "fan_home_win":
      return {
        speaker: cast.groundskeeper_name,
        icon: "🌱",
        message: "Heimspiel gewonnen. Der Rasen hat's auch gespürt.",
      };
    case "fan_derby_loss":
      return {
        speaker: cast.bratwurst_vendor_name,
        icon: "😤",
        message: context.opponent
          ? `Derby gegen ${context.opponent} verloren. Das tut weh — auch am Stand.`
          : "Derby verloren. Das tut weh — auch am Stand.",
      };
    case "fan_supporters_bus":
      return {
        speaker: cast.fan_rep_label,
        icon: "🚌",
        message: "Der Fanbus ist voll. Wir fahren mit — egal wie weit.",
      };
    case "hospitality_engagement":
      return {
        speaker: cast.bratwurst_vendor_name,
        icon: "💍",
        message: "Verlobung im Restaurant — das Video geht viral. Zwölf Wochen lang kein freier Tisch.",
      };
    case "hospitality_overtime":
      return {
        speaker: cast.groundskeeper_name,
        icon: "🍻",
        message: "Die Feier wollte nicht nach Hause. Überstunden fürs Personal — das kostet extra.",
      };
    default:
      return {
        speaker: cast.fan_rep_label,
        icon: "👥",
        message: "Wir stehen hinter dem Verein. Zeig uns Einsatz.",
      };
  }
}

export function storyInboxPayload(
  beatId: string,
  cast: StoryCast,
  context: Record<string, string | number | undefined> = {},
): StoryInboxPayload {
  switch (beatId) {
    case "board_survival_intro":
      return {
        beatId,
        title: "Vorstand · Klassenerhalt",
        body: "Der Fanrat erwartet kein Wunder — aber Überlebenskampf. Klassenerhalt ist das Saisonziel.",
        source: "board",
        choices: [
          { id: "accept", label: "Überleben", icon: "●" },
          { id: "ambitious", label: "Anspruch", icon: "▲" },
        ],
      };
    case "press_hostile_bad_week":
      return {
        beatId,
        title: cast.journalist_hostile_name,
        body: "Schlechte Woche. Die Presse fragt, ob der Verein den Trainer noch trägt.",
        source: "press",
        choices: [
          { id: "deflect", label: "Team schützen", icon: "🛡️" },
          { id: "attack_press", label: "Presse kritisiert", icon: "📰" },
          { id: "honest", label: "Ehrlich zugeben", icon: "🎯" },
        ],
      };
    case "press_ally_support":
      return {
        beatId,
        title: cast.journalist_ally_name,
        body: `${cast.journalist_ally_name} bietet eine fairere Story: der Underdog-Kampf der Fans.`,
        source: "press",
        choices: [
          { id: "embrace", label: "Story teilen", icon: "❤️" },
          { id: "cautious", label: "Vorsichtig bleiben", icon: "🤫" },
        ],
      };
    case "assistant_low_morale":
      return {
        beatId,
        title: cast.assistant_name,
        body: `${cast.assistant_name} warnt: Die Kabine ist am Boden. Moral und Form passen nicht zusammen.`,
        source: "assistant",
        choices: [
          { id: "rally", label: "Team-Meeting", icon: "📋" },
          { id: "rest", label: "Training lockern", icon: "😌" },
        ],
      };
    case "captain_speak":
      return {
        beatId,
        title: "Kapitän",
        body: context.captainName
          ? `${context.captainName} will mit dir reden — die Jungs brauchen eine klare Linie.`
          : "Der Kapitän will mit dir reden — die Jungs brauchen eine klare Linie.",
        source: "captain",
        choices: [
          { id: "back_players", label: "Spieler unterstützen", icon: "💪" },
          { id: "demand_more", label: "Mehr verlangen", icon: "⚡" },
        ],
      };
    case "sell_star_press":
      return {
        beatId,
        title: cast.journalist_hostile_name,
        body: "Nach dem Star-Verkauf fragt die Presse, ob der Verein seine Identität verkauft.",
        source: "press",
        choices: [
          { id: "project", label: "Neustart betonen", icon: "🌱" },
          { id: "money", label: "Finanzen erklären", icon: "💶" },
        ],
      };
    case "arc_climax_week30":
      return {
        beatId,
        title: "Vorstand · Entscheidungswochen",
        body: "Ab jetzt zählt jeder Punkt. Der Vorstand erwartet sichtbaren Kampf.",
        source: "board",
        choices: [
          { id: "fight", label: "Kämpfen wir", icon: "⚔️" },
        ],
      };
    case "derby_week":
      return {
        beatId,
        title: cast.fan_rep_label,
        body: context.opponent
          ? `Derby-Woche gegen ${context.opponent}. Die ganze Stadt schaut hin.`
          : "Derby-Woche. Die ganze Stadt schaut hin.",
        source: "fan",
        choices: [
          { id: "embrace", label: "Druck annehmen", icon: "🔥" },
          { id: "calm", label: "Ruhe bewahren", icon: "🧘" },
        ],
      };
    default:
      return {
        beatId,
        title: "Verein",
        body: "Eine wichtige Entscheidung steht an.",
        source: "board",
        choices: [{ id: "ok", label: "Weiter", icon: "➡️" }],
      };
  }
}

export function seasonCodaChronicle(
  survived: boolean,
  place: number,
  cast: StoryCast,
  origin: CareerOrigin | null,
): { title: string; body: string; icon: string } {
  const originNote =
    origin === "raffle"
      ? "Der Losgewinn"
      : origin === "passionate_letter"
        ? "Der Brief"
        : origin === "community_takeover"
          ? "Die Gemeinschaft"
          : "Der Start";
  if (survived) {
    return {
      icon: "🛡️",
      title: "Gemeinsam gehalten",
      body: `${originNote}, ${cast.fan_rep_label} und ein Platz ${place} — der Abstieg blieb aus.`,
    };
  }
  return {
    icon: "📉",
    title: "Saison der Wahrheit",
    body: `${originNote} reichte nicht: Platz ${place}. ${cast.journalist_ally_name} schrieb trotzdem von Stolz in der Kurve.`,
  };
}
