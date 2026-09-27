import type { SaveMigration } from "./index.ts";

function realisticContractEnd(playerId: string): number {
  let hash = 0;
  for (let index = 0; index < playerId.length; index++) {
    hash = Math.imul(hash ^ playerId.charCodeAt(index), 0x9e3779b1);
  }
  return 2 + (hash % 3);
}

export const migration029AiTransferMarket: SaveMigration = {
  id: "migration_029_ai_transfer_market",
  apply: (save) => {
    const pipeline = save.state.pipeline;
    if (pipeline?.transfer_state && !pipeline.transfer_state.ai_budgets) {
      pipeline.transfer_state.ai_budgets = {};
    }
    if (pipeline?.rival_players) {
      pipeline.rival_players = pipeline.rival_players.map((player) => {
        if (!player.contract || player.contract.until_season < 90) return player;
        return {
          ...player,
          contract: {
            ...player.contract,
            until_season: realisticContractEnd(player.id),
          },
        };
      });
    }
    save.manifest.save_version = 29;
    return save;
  },
};
