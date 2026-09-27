import { defaultClubFinances, normalizeFinances } from "../../economy/club-finances.ts";
import type { SaveMigration } from "./index.ts";

export const migration017Finances: SaveMigration = {
  id: "migration_017_finances",
  apply: (save) => {
    const defaults = defaultClubFinances();
    const pipeline = save.state.pipeline;
    if (!pipeline) {
      save.manifest.save_version = 17;
      return save;
    }
    const old = pipeline.club_finances;
    const cash = old?.cash ?? defaults.cash;
    pipeline.club_finances = normalizeFinances({
      cash,
      transfer_budget:
        old && "transfer_budget" in old
          ? old.transfer_budget
          : Math.min(cash, defaults.transfer_budget),
      wage_budget_weekly:
        old && "wage_budget_weekly" in old ? old.wage_budget_weekly : defaults.wage_budget_weekly,
      last_closed_month:
        old && "last_closed_month" in old ? old.last_closed_month : defaults.last_closed_month,
      ledger: old && "ledger" in old ? old.ledger : [],
      pending_lines: old && "pending_lines" in old ? old.pending_lines : [],
      month_opening_cash: old && "month_opening_cash" in old ? old.month_opening_cash : cash,
    });
    save.manifest.save_version = 17;
    return save;
  },
};
