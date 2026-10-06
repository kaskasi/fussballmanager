import type { ScoutBoard } from "../../scouting/scout-board.ts";
import {
  normalizeDiscovery,
  REGION_SCOUT_TIER_MAX,
  type ScoutDiscoveryState,
} from "../../scouting/scout-discovery.ts";
import { SCOUT_MAP_ZONES } from "../../scouting/scout-region-map.ts";
import type { SaveMigration } from "./index.ts";

export const migration062RegionScoutTier: SaveMigration = {
  id: "migration_062_region_scout_tier",
  apply(save) {
    const board = save.state.pipeline?.scout_board as ScoutBoard | undefined;
    if (board?.discovery) {
      const discovery = normalizeDiscovery(board.discovery as ScoutDiscoveryState);
      const region_scout_tier: Record<string, number> = {
        ...(discovery.region_scout_tier ?? {}),
      };
      for (const zone of SCOUT_MAP_ZONES) {
        if ((discovery.discovered_region_ids ?? []).includes(zone.id)) {
          region_scout_tier[zone.id] = REGION_SCOUT_TIER_MAX;
        } else if (region_scout_tier[zone.id] == null) {
          region_scout_tier[zone.id] = 0;
        }
      }
      save.state.pipeline!.scout_board = {
        ...board,
        discovery: normalizeDiscovery({ ...discovery, region_scout_tier }),
      };
    }
    save.manifest.save_version = 62;
    return save;
  },
};
