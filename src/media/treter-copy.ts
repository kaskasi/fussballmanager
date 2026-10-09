import { campNationById } from "../youth/satellite-camps.ts";

/** TODO(media): weitere CC0-Fotos für Der Treter — siehe docs/prd/09. */
export const TRETER_MASTHEAD = "Der Treter";

export const TRETER_IMAGE = {
  campBr: "/assets/photos/camps/camp-br.jpg",
  campFr: "/assets/photos/camps/camp-fr.jpg",
  campNg: "/assets/photos/camps/camp-ng.jpg",
  campTr: "/assets/photos/camps/camp-tr.jpg",
  campHr: "/assets/photos/camps/camp-hr.jpg",
  campPl: "/assets/photos/camps/camp-pl.jpg",
  moodCrowd: "/assets/photos/mood-crowd-bokeh.jpg",
  moodRain: "/assets/photos/mood-rain.jpg",
  precinct: "/assets/photos/precinct-header.jpg",
  stadion: "/assets/photos/stad-tier-m.jpg",
} as const;

const CAMP_IMAGE: Record<string, string> = {
  camp_br: TRETER_IMAGE.campBr,
  camp_fr: TRETER_IMAGE.campFr,
  camp_ng: TRETER_IMAGE.campNg,
  camp_tr: TRETER_IMAGE.campTr,
  camp_hr: TRETER_IMAGE.campHr,
  camp_pl: TRETER_IMAGE.campPl,
};

export function treterCampImage(campId: string): string {
  return CAMP_IMAGE[campId] ?? TRETER_IMAGE.moodCrowd;
}

export function treterCampHeroCopy(campId: string, clubLabel: string): {
  headline: string;
  kicker: string;
  body: string;
} {
  const nation = campNationById(campId);
  const label = nation?.label ?? campId;
  const region = nation?.region ?? "";

  if (campId === "camp_br") {
    return {
      kicker: `${clubLabel} · Satelliten-Akademie`,
      headline: `Tropen-Offensive: ${clubLabel} eröffnet Camp in ${label}`,
      body: `São Paulo atmet Fußball — und ${clubLabel} hat jetzt einen Fuß in der Wärme. Unser Fototeam zeigt Palmen, Nachttraining unter Flutlicht und den ersten Kontakt mit U17-Talenten aus ${region}. Die Vereinsführung nennt es «den mutigsten Schachzug seit Jahren». Kritiker fragen nach den Kosten; der Sportliche Direktor antwortet nur: «Wir wollen Spieler mit Frechheit, nicht mit Excel.» Drei solche Camps pro Karriere — dieses hier zählt.`,
    };
  }
  if (campId === "camp_ng") {
    return {
      kicker: "Akademie · Lagos",
      headline: `${clubLabel} setzt auf Tempo aus ${label}`,
      body: `Das neue Camp in ${region} soll Rohdiamanten früh sichtbar machen. «Geschwindigkeit und Mut», laut interner Notiz, «bevor der Markt zuschlägt.» Bilder aus dem Compound zeigen Sandplätze, enges Pressing in Kleingruppen und den Stolz der Betreuer.`,
    };
  }
  if (campId === "camp_fr") {
    return {
      kicker: "Technik · Lyon",
      headline: `Französische Schule für ${clubLabel}`,
      body: `In ${region} trainieren künftig die besten Passfüße der Akademie-Familie. Der Treter war vor Ort: strukturierte Einheiten, viel Ballkontakt, wenig Show. «Genau die Adresse für Spieler, die zwischen den Linien denken», kommentiert ein Beobachter.`,
    };
  }

  return {
    kicker: `${clubLabel} · Camp`,
    headline: `Neues Jugendlager: ${label}`,
    body: `${clubLabel} investiert in ${label} (${region}). Das Camp ist live — Intake, Betreuer und erste Talente folgen in den nächsten Wochen. Der Klub bleibt bei maximal drei Camps; jeder Eröffnungsschlag wird in der Redaktion gross aufgezogen.`,
  };
}

export function treterFormCopy(clubLabel: string, lossesInRow: number, formLine: string): {
  headline: string;
  body: string;
} {
  if (lossesInRow >= 3) {
    return {
      headline: `Yikes — ${clubLabel} verliert zum ${lossesInRow}. Mal in Folge`,
      body: `Formkurve: ${formLine}. Die Stimmung kippt, die Kommentarspalten werden laut. «Nicht panisch», heisst es intern — «aber ehrlich: so gewinnt man keinen Abstiegskampf.»`,
    };
  }
  if (lossesInRow === 2) {
    return {
      headline: `${clubLabel} stolpert — zwei Niederlagen am Stück`,
      body: `Die letzten Ergebnisse (${formLine}) erinnern daran, dass die Liga kein Freund ist. Nächster Gegner wartet; Training und Nerven müssen passen.`,
    };
  }
  return {
    headline: `${clubLabel}: Form im Blick`,
    body: `Aktuelle Serie: ${formLine}. Kein Drama — aber Der Treter behält die Tabellenmitte im Visier.`,
  };
}

export function treterBoardCopy(clubLabel: string, pressure: number): { headline: string; body: string } {
  if (pressure >= 70) {
    return {
      headline: "Vorstand am Limit",
      body: `Der Druck auf ${clubLabel} steigt auf ${pressure} von 100. Interne Quellen sprechen von «klaren Worten» und «keinem weiteren Fehlgriff». Der Trainer soll liefern — jetzt.`,
    };
  }
  if (pressure >= 40) {
    return {
      headline: "Vereinsführung wird ungeduldig",
      body: `Board-Druck bei ${pressure}: Ziele aus dem Sommer sind nicht vergessen. ${clubLabel} muss Punkte und Kasse in Einklang bringen.`,
    };
  }
  return {
    headline: "Vorstand beobachtet",
    body: `Moderater Druck (${pressure}) — noch kein Ultimatum. Trotzdem: jede Woche zählt für ${clubLabel}.`,
  };
}

export function treterScoutCopy(clubLabel: string, targetLabel: string): { headline: string; body: string } {
  return {
    headline: `Scout von ${clubLabel} unterwegs`,
    body: `Unsere Linse hat Bewegung gemeldet: ein Scout des Klubs ist in ${targetLabel} gesichtet worden. Offiziell schweigt man — inoffiziell heisst es, der Verein will den Markt früh lesen, bevor die Konkurrenz wach wird.`,
  };
}

export function treterMerchCopy(clubLabel: string, revenue: number, units: number): {
  headline: string;
  body: string;
} {
  return {
    headline: "Fanshop-Zähler dreht",
    body: `${clubLabel} verkaufte zuletzt rund ${units} Artikel im Merchandising — Umsatz etwa € ${Math.round(revenue).toLocaleString("de-DE")}. «Die Leute wollen Farben sehen», sagt ein Händler am Stadion.`,
  };
}

export function treterStadiumCopy(clubLabel: string, detail: string): { headline: string; body: string } {
  return {
    headline: `${clubLabel} baut am Gelände`,
    body: `${detail} Der Treter listet Investitionen in Infrastruktur — weil Tribüne und Training irgendwann auch Geschichten erzählen.`,
  };
}

export function treterGoalOfMonthCopy(scorer: string, minute: string, scoreline: string): {
  headline: string;
  body: string;
} {
  return {
    headline: `Tor des Monats: ${scorer}`,
    body: `${minute} — ${scoreline}. Die Redaktion wählt diesen Treffer als Bild des Monats. «Technik, Timing, kein Zufall», urteilt unser Taktikredakteur.`,
  };
}
