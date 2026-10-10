import { generateContractWeights } from "../../transfers/contract-priorities.ts";
import { applyFairInitialContract } from "../../transfers/fair-initial-contract.ts";
import type { Player } from "../../types/player.ts";
import type { SaveMigration } from "./index.ts";

function migratePlayer(player: Player, masterSeed: number, season: number): Player {
  let next = player;
  if (!next.hidden.contract_weights) {
    next = {
      ...next,
      hidden: {
        ...next.hidden,
        contract_weights: generateContractWeights(next.id, masterSeed),
      },
    };
  }
  if (next.squad_status === "pro" && next.contract) {
    next = applyFairInitialContract(next, season);
  }
  return next;
}

export const migration086F54TransferPillar: SaveMigration = {
  id: "migration_086_f54_transfer_pillar",
  apply(save) {
    const masterSeed = save.rng_state?.master_seed ?? 1;
    const season = save.manifest.current_week?.season ?? 1;
    save.players = save.players.map((player) => migratePlayer(player, masterSeed, season));
    const pipeline = save.state.pipeline;
    if (pipeline?.rival_players?.length) {
      pipeline.rival_players = pipeline.rival_players.map((player) =>
        migratePlayer(player, masterSeed, season),
      );
    }
    if (pipeline?.transfer_state) {
      pipeline.transfer_state = {
        ...pipeline.transfer_state,
        pending_purchases: pipeline.transfer_state.pending_purchases ?? [],
        inbound_offers: pipeline.transfer_state.inbound_offers ?? [],
      };
    }
    save.manifest.save_version = 86;
    return save;
  },
};
