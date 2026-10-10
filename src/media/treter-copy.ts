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

function hashPick(seed: string, mod: number): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (Math.imul(31, hash) + seed.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % mod;
}

export function treterCampHeroCopy(
  campId: string,
  clubLabel: string,
  variantSeed = campId,
): {
  headline: string;
  kicker: string;
  body: string;
} {
  const nation = campNationById(campId);
  const label = nation?.label ?? campId;
  const region = nation?.region ?? "";

  const byCamp: Record<string, readonly { kicker: string; headline: string; body: string }[]> = {
    camp_br: [
      {
        kicker: `${clubLabel} · Satelliten-Akademie`,
        headline: `Tropen-Offensive: ${clubLabel} eröffnet Camp in ${label}`,
        body: `São Paulo atmet Fußball — ${clubLabel} hat einen Fuß in der Wärme. Palmen, Nachttraining, erste U17-Kontakte aus ${region}. «Mutiger Schachzug», sagt die Führung; Kritiker nennen die Kasse.`,
      },
      {
        kicker: "Brasilien · Eröffnung",
        headline: `${label}: ${clubLabel} baut die Fernwärme-Pipeline`,
        body: `Reporter vor Ort in ${region}: viel Ball, wenig Büro. Das Camp soll Frechheit und Tempo liefern — «bevor der Markt die Preise kennt», flüstert ein Scout.`,
      },
      {
        kicker: "Akademie global",
        headline: `Samba und Struktur — ${clubLabel} in ${label}`,
        body: `Neues Satelliten-Camp live. Betreuer, Intake-Routinen und erste Talente: ${clubLabel} investiert in ${region}. Maximal drei Camps pro Klub — dieses zählt.`,
      },
    ],
    camp_ng: [
      {
        kicker: "Akademie · Lagos",
        headline: `${clubLabel} setzt auf Tempo aus ${label}`,
        body: `Sandplätze, enges Pressing, laute Betreuer: das Camp in ${region} sucht Rohdiamanten mit Mut.`,
      },
      {
        kicker: "Westafrika",
        headline: `${clubLabel} eröffnet Lagos-Pipeline`,
        body: `Geschwindigkeit vor dem Excel-Sheet — so lautet die interne Notiz zum Camp in ${label}. Der Treter zeigt Bilder aus dem Compound.`,
      },
    ],
    camp_fr: [
      {
        kicker: "Technik · Lyon",
        headline: `Französische Schule für ${clubLabel}`,
        body: `In ${region}: Passfüße, Ballkontakt, wenig Show. «Spieler, die zwischen den Linien denken», sagt ein Beobachter.`,
      },
      {
        kicker: "Lyon · Campus",
        headline: `${clubLabel} holt ${label}-Routine ins Netz`,
        body: `Strukturierte Einheiten, klare Hierarchie — das neue Camp soll Technik exportieren, nicht nur Fotos.`,
      },
    ],
    camp_tr: [
      {
        kicker: "Istanbul · Camp",
        headline: `${clubLabel} verankert sich am Bosporus`,
        body: `Zwischen Kontinenten: ${clubLabel} startet in ${region}. Enges Spiel, körperliche Duellkultur — «genau unser Mix», heißt es intern.`,
      },
      {
        kicker: "Türkei · Akademie",
        headline: `Neues Lager: ${label} für ${clubLabel}`,
        body: `Der Klub erweitert die Satelliten-Karte. Erste Talente aus ${region} sollen ab Sommer sichtbar werden.`,
      },
    ],
    camp_hr: [
      {
        kicker: "Adria · Dubrovnik",
        headline: `${clubLabel} trainiert an der Küste`,
        body: `Technik und Spielintelligenz — das Camp in ${region} wirbt mit kleinen Gruppen und viel Video.`,
      },
      {
        kicker: "Kroatien",
        headline: `Mediterrane Adresse für ${clubLabel}`,
        body: `${label} ist live: ${clubLabel} setzt auf die balkanische Spielschule — kompakt, zweikampfstark, lernwillig.`,
      },
    ],
    camp_pl: [
      {
        kicker: "Polen · Krakau",
        headline: `${clubLabel} baut Ost-Pipeline`,
        body: `Disziplin und Laufarbeit: das Camp in ${region} soll robuste Talente früh binden.`,
      },
      {
        kicker: "Akademie Ost",
        headline: `${label}: ${clubLabel} erweitert das Netz`,
        body: `Neues Satelliten-Camp — Intake und Betreuer folgen. Der Verein bleibt bei höchstens drei Adressen weltweit.`,
      },
    ],
  };

  const variants = byCamp[campId] ?? [
    {
      kicker: `${clubLabel} · Camp`,
      headline: `Neues Jugendlager: ${label}`,
      body: `${clubLabel} investiert in ${label} (${region}). Das Camp ist live — Intake und Talente folgen.`,
    },
  ];
  return variants[hashPick(variantSeed, variants.length)] ?? variants[0]!;
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
