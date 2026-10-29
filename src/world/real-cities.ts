/** WGS84 cities for procedural clubs and scout-map placement (real names, fictional league). */

export interface RealCity {
  name: string;
  lat: number;
  lon: number;
  worldRegion: string;
}

/** Cities assigned to clubs in `generateClubs` (cycled per region). */
export const REAL_CITIES_BY_WORLD_REGION: Record<string, readonly RealCity[]> = {
  Nordküste: [
    { name: "Elmshorn", lat: 53.7535, lon: 9.6534, worldRegion: "Nordküste" },
    { name: "Glückstadt", lat: 53.7897, lon: 9.4239, worldRegion: "Nordküste" },
    { name: "Pinneberg", lat: 53.6673, lon: 9.7944, worldRegion: "Nordküste" },
    { name: "Wedel", lat: 53.5833, lon: 9.6983, worldRegion: "Nordküste" },
    { name: "Uetersen", lat: 53.687, lon: 9.665, worldRegion: "Nordküste" },
    { name: "Tornesch", lat: 53.693, lon: 9.713, worldRegion: "Nordküste" },
  ],
  Elbmarsch: [
    { name: "Kaltenkirchen", lat: 53.836, lon: 9.976, worldRegion: "Elbmarsch" },
    { name: "Hasloh", lat: 53.737, lon: 9.913, worldRegion: "Elbmarsch" },
    { name: "Itzehoe", lat: 53.925, lon: 9.515, worldRegion: "Elbmarsch" },
    { name: "Heide", lat: 54.196, lon: 9.098, worldRegion: "Elbmarsch" },
    { name: "Meldorf", lat: 54.083, lon: 9.072, worldRegion: "Elbmarsch" },
    { name: "Brunsbüttel", lat: 53.889, lon: 9.139, worldRegion: "Elbmarsch" },
  ],
  Fördeküste: [
    { name: "Kiel", lat: 54.3233, lon: 10.1394, worldRegion: "Fördeküste" },
    { name: "Flensburg", lat: 54.7819, lon: 9.4366, worldRegion: "Fördeküste" },
    { name: "Eckernförde", lat: 54.473, lon: 9.836, worldRegion: "Fördeküste" },
    { name: "Rendsburg", lat: 54.303, lon: 9.663, worldRegion: "Fördeküste" },
    { name: "Schleswig", lat: 54.518, lon: 9.565, worldRegion: "Fördeküste" },
    { name: "Neumünster", lat: 54.071, lon: 9.984, worldRegion: "Fördeküste" },
  ],
  Hansebogen: [
    { name: "Bremen", lat: 53.0758, lon: 8.8072, worldRegion: "Hansebogen" },
    { name: "Hamburg", lat: 53.5511, lon: 9.9937, worldRegion: "Hansebogen" },
    { name: "Lübeck", lat: 53.8655, lon: 10.6866, worldRegion: "Hansebogen" },
    { name: "Bremerhaven", lat: 53.539, lon: 8.580, worldRegion: "Hansebogen" },
    { name: "Stade", lat: 53.599, lon: 9.476, worldRegion: "Hansebogen" },
    { name: "Cuxhaven", lat: 53.861, lon: 8.694, worldRegion: "Hansebogen" },
  ],
  Heideland: [
    { name: "Husum", lat: 54.484, lon: 9.051, worldRegion: "Heideland" },
    { name: "Niebüll", lat: 54.787, lon: 8.829, worldRegion: "Heideland" },
    { name: "Tönning", lat: 54.317, lon: 8.944, worldRegion: "Heideland" },
    { name: "Bredstedt", lat: 54.622, lon: 8.967, worldRegion: "Heideland" },
    { name: "Büsum", lat: 54.127, lon: 8.858, worldRegion: "Heideland" },
    { name: "Westerland", lat: 54.907, lon: 8.303, worldRegion: "Heideland" },
  ],
  Moorland: [
    { name: "List", lat: 55.019, lon: 8.431, worldRegion: "Moorland" },
    { name: "Wyk", lat: 54.691, lon: 8.567, worldRegion: "Moorland" },
    { name: "Garding", lat: 54.329, lon: 8.781, worldRegion: "Moorland" },
    { name: "Pellworm", lat: 54.517, lon: 8.636, worldRegion: "Moorland" },
    { name: "Hattstedt", lat: 54.523, lon: 9.016, worldRegion: "Moorland" },
    { name: "Friedrichstadt", lat: 54.376, lon: 9.089, worldRegion: "Moorland" },
  ],
};

/**
 * PRD 32 §5 — cities for the national tiers 1–3 (outside the northern
 * regions). The region names are invented, like the northern ones.
 */
export const NATIONAL_CITIES_BY_WORLD_REGION: Record<string, readonly RealCity[]> = {
  Rheinschiene: [
    { name: "Bonn", lat: 50.7374, lon: 7.0982, worldRegion: "Rheinschiene" },
    { name: "Neuss", lat: 51.2042, lon: 6.6879, worldRegion: "Rheinschiene" },
    { name: "Krefeld", lat: 51.3388, lon: 6.5853, worldRegion: "Rheinschiene" },
    { name: "Siegburg", lat: 50.7998, lon: 7.2075, worldRegion: "Rheinschiene" },
    { name: "Solingen", lat: 51.1652, lon: 7.0671, worldRegion: "Rheinschiene" },
    { name: "Remscheid", lat: 51.1787, lon: 7.1897, worldRegion: "Rheinschiene" },
    { name: "Dormagen", lat: 51.096, lon: 6.8401, worldRegion: "Rheinschiene" },
    { name: "Euskirchen", lat: 50.6602, lon: 6.7874, worldRegion: "Rheinschiene" },
    { name: "Wesel", lat: 51.6586, lon: 6.6178, worldRegion: "Rheinschiene" },
  ],
  Westfalenpforte: [
    { name: "Hamm", lat: 51.6739, lon: 7.815, worldRegion: "Westfalenpforte" },
    { name: "Lippstadt", lat: 51.6719, lon: 8.3445, worldRegion: "Westfalenpforte" },
    { name: "Minden", lat: 52.2898, lon: 8.9147, worldRegion: "Westfalenpforte" },
    { name: "Detmold", lat: 51.9387, lon: 8.8792, worldRegion: "Westfalenpforte" },
    { name: "Gütersloh", lat: 51.9032, lon: 8.3858, worldRegion: "Westfalenpforte" },
    { name: "Iserlohn", lat: 51.3758, lon: 7.695, worldRegion: "Westfalenpforte" },
    { name: "Witten", lat: 51.4436, lon: 7.3528, worldRegion: "Westfalenpforte" },
    { name: "Soest", lat: 51.5711, lon: 8.1059, worldRegion: "Westfalenpforte" },
    { name: "Lüdenscheid", lat: 51.2198, lon: 7.6273, worldRegion: "Westfalenpforte" },
  ],
  Mittelgebirge: [
    { name: "Kassel", lat: 51.3127, lon: 9.4797, worldRegion: "Mittelgebirge" },
    { name: "Marburg", lat: 50.8021, lon: 8.7667, worldRegion: "Mittelgebirge" },
    { name: "Gießen", lat: 50.5841, lon: 8.6784, worldRegion: "Mittelgebirge" },
    { name: "Fulda", lat: 50.5558, lon: 9.6808, worldRegion: "Mittelgebirge" },
    { name: "Siegen", lat: 50.8748, lon: 8.0243, worldRegion: "Mittelgebirge" },
    { name: "Wetzlar", lat: 50.5582, lon: 8.5049, worldRegion: "Mittelgebirge" },
    { name: "Göttingen", lat: 51.5413, lon: 9.9158, worldRegion: "Mittelgebirge" },
    { name: "Hameln", lat: 52.1039, lon: 9.357, worldRegion: "Mittelgebirge" },
    { name: "Goslar", lat: 51.906, lon: 10.429, worldRegion: "Mittelgebirge" },
  ],
  Elbtal: [
    { name: "Dessau", lat: 51.8333, lon: 12.2333, worldRegion: "Elbtal" },
    { name: "Wittenberg", lat: 51.8671, lon: 12.6484, worldRegion: "Elbtal" },
    { name: "Bautzen", lat: 51.1814, lon: 14.4277, worldRegion: "Elbtal" },
    { name: "Görlitz", lat: 51.1528, lon: 14.9872, worldRegion: "Elbtal" },
    { name: "Plauen", lat: 50.4947, lon: 12.138, worldRegion: "Elbtal" },
    { name: "Weimar", lat: 50.9795, lon: 11.3235, worldRegion: "Elbtal" },
    { name: "Gera", lat: 50.8806, lon: 12.0833, worldRegion: "Elbtal" },
    { name: "Potsdam", lat: 52.3906, lon: 13.0645, worldRegion: "Elbtal" },
    { name: "Stendal", lat: 52.6061, lon: 11.8586, worldRegion: "Elbtal" },
  ],
  Oberrhein: [
    { name: "Pforzheim", lat: 48.8922, lon: 8.6946, worldRegion: "Oberrhein" },
    { name: "Tübingen", lat: 48.5216, lon: 9.0576, worldRegion: "Oberrhein" },
    { name: "Reutlingen", lat: 48.4914, lon: 9.2043, worldRegion: "Oberrhein" },
    { name: "Esslingen", lat: 48.7406, lon: 9.3108, worldRegion: "Oberrhein" },
    { name: "Heilbronn", lat: 49.1427, lon: 9.2109, worldRegion: "Oberrhein" },
    { name: "Offenburg", lat: 48.4729, lon: 7.9449, worldRegion: "Oberrhein" },
    { name: "Lörrach", lat: 47.6156, lon: 7.6614, worldRegion: "Oberrhein" },
    { name: "Konstanz", lat: 47.6603, lon: 9.1758, worldRegion: "Oberrhein" },
    { name: "Speyer", lat: 49.3173, lon: 8.4412, worldRegion: "Oberrhein" },
  ],
  Alpenvorland: [
    { name: "Landshut", lat: 48.5372, lon: 12.1522, worldRegion: "Alpenvorland" },
    { name: "Passau", lat: 48.5665, lon: 13.4319, worldRegion: "Alpenvorland" },
    { name: "Kempten", lat: 47.7286, lon: 10.3158, worldRegion: "Alpenvorland" },
    { name: "Rosenheim", lat: 47.8571, lon: 12.1181, worldRegion: "Alpenvorland" },
    { name: "Memmingen", lat: 47.9837, lon: 10.1822, worldRegion: "Alpenvorland" },
    { name: "Bamberg", lat: 49.8988, lon: 10.9028, worldRegion: "Alpenvorland" },
    { name: "Erlangen", lat: 49.5897, lon: 11.004, worldRegion: "Alpenvorland" },
    { name: "Ravensburg", lat: 47.7815, lon: 9.6115, worldRegion: "Alpenvorland" },
    { name: "Straubing", lat: 48.8777, lon: 12.5737, worldRegion: "Alpenvorland" },
  ],
};

/** All national cities, region by region. */
export const NATIONAL_CITIES: readonly RealCity[] = Object.values(NATIONAL_CITIES_BY_WORLD_REGION).flat();

const CITY_BY_NAME = new Map<string, RealCity>();
for (const cities of [...Object.values(REAL_CITIES_BY_WORLD_REGION), ...Object.values(NATIONAL_CITIES_BY_WORLD_REGION)]) {
  for (const city of cities) {
    CITY_BY_NAME.set(city.name.toLowerCase(), city);
  }
}

export function realCityByName(name: string): RealCity | undefined {
  return CITY_BY_NAME.get(name.trim().toLowerCase());
}

export function realCityForWorldRegion(
  worldRegion: string,
  indexInRegion: number,
): RealCity | undefined {
  const pool = REAL_CITIES_BY_WORLD_REGION[worldRegion];
  if (!pool || pool.length === 0) return undefined;
  return pool[indexInRegion % pool.length];
}
