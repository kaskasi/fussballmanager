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

const CITY_BY_NAME = new Map<string, RealCity>();
for (const cities of Object.values(REAL_CITIES_BY_WORLD_REGION)) {
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
