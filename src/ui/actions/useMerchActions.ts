import { useCallback, useEffect, useRef } from "react";
import type { GameSession } from "../../persistence/game-session.ts";
import type { ClubFinances } from "../../economy/club-finances.ts";
import { spendClubCash } from "../../economy/club-finances.ts";
import {
  buyBulkOffer,
  deliverMerchandisingOrders,
  ensureMerchBulkMarket,
  orderMerchOnDemand,
  canAffordMerchPurchase,
  startMerchSkuSale,
  type MerchSkuId,
} from "../../economy/merchandising.ts";
import { normalizeClubStadium, type ClubStadium } from "../../stadium/club-stadium.ts";
import type { Screen } from "../shell/types.ts";
import { trackEvent } from "../../telemetry/analytics.ts";

type PatchSession = (updater: (current: GameSession) => GameSession) => void;

type RequestClubSpend = (
  cost: number,
  title: string,
  apply: (current: GameSession) => GameSession,
  options?: { infrastructure?: boolean },
) => void;

export function useMerchActions(args: {
  screen: Screen;
  season: number;
  week: number;
  weekday: number;
  masterSeed: number;
  stadium: ClubStadium;
  finances: ClubFinances;
  patchSession: PatchSession;
  requestClubSpend: RequestClubSpend;
}) {
  const {
    screen,
    season,
    week,
    weekday,
    masterSeed,
    stadium,
    finances,
    patchSession,
    requestClubSpend,
  } = args;

  const merchSyncStampRef = useRef<string | null>(null);
  useEffect(() => {
    if (screen !== "merchandising") return;
    const stamp = `${season}-${week}-${weekday}`;
    if (merchSyncStampRef.current === stamp) return;
    merchSyncStampRef.current = stamp;
    patchSession((current) => {
      let nextStadium = deliverMerchandisingOrders(
        current.stadium,
        current.season,
        current.week,
        current.weekday,
      );
      nextStadium = ensureMerchBulkMarket(
        nextStadium,
        current.season,
        current.week,
        current.masterSeed,
      );
      if (nextStadium === current.stadium) return current;
      return { ...current, stadium: nextStadium };
    });
  }, [screen, season, week, weekday, patchSession]);

  const handleMerchandisingChange = useCallback(
    (next: ClubStadium) => {
      patchSession((current) => {
        if (next === current.stadium) return current;
        return { ...current, stadium: next };
      });
    },
    [patchSession],
  );

  const handleMerchBulkPurchase = useCallback(
    (offerId: string) => {
      const fresh = ensureMerchBulkMarket(stadium, season, week, masterSeed);
      const preview = buyBulkOffer(fresh, offerId, season, week);
      if (!preview || !canAffordMerchPurchase(finances, preview.cost)) return;
      requestClubSpend(
        preview.cost,
        "Merchandising · Marktplatz",
        (session) => {
          const synced = ensureMerchBulkMarket(
            session.stadium,
            session.season,
            session.week,
            session.masterSeed,
          );
          const next = buyBulkOffer(synced, offerId, session.season, session.week);
          if (!next || !canAffordMerchPurchase(session.finances, next.cost)) return session;
          return {
            ...session,
            stadium: normalizeClubStadium(next.stadium),
            finances: spendClubCash(session.finances, next.cost, session.week),
          };
        },
        { infrastructure: true },
      );
      trackEvent("merch_bulk_purchase_completed");
    },
    [finances, masterSeed, requestClubSpend, season, stadium, week],
  );

  const handleMerchSaleStart = useCallback(
    (sku: MerchSkuId, salePrice: number) => {
      patchSession((current) => ({
        ...current,
        stadium: normalizeClubStadium(
          startMerchSkuSale(current.stadium, sku, salePrice, current.season, current.week),
        ),
      }));
    },
    [patchSession],
  );

  const handleMerchOnDemand = useCallback(
    (sku: MerchSkuId, qty: number) => {
      const preview = orderMerchOnDemand(stadium, sku, qty, season, week, weekday);
      if (!preview || !canAffordMerchPurchase(finances, preview.cost)) return;
      requestClubSpend(
        preview.cost,
        "Merchandising · On Demand",
        (session) => {
          const next = orderMerchOnDemand(
            session.stadium,
            sku,
            qty,
            session.season,
            session.week,
            session.weekday,
          );
          if (!next || !canAffordMerchPurchase(session.finances, next.cost)) return session;
          return {
            ...session,
            stadium: normalizeClubStadium(next.stadium),
            finances: spendClubCash(session.finances, next.cost, session.week),
          };
        },
        { infrastructure: true },
      );
      trackEvent("merch_on_demand_order_completed", { quantity: qty });
    },
    [finances, requestClubSpend, season, stadium, week, weekday],
  );

  return {
    handleMerchandisingChange,
    handleMerchBulkPurchase,
    handleMerchSaleStart,
    handleMerchOnDemand,
  };
}

export type MerchActionHandlers = ReturnType<typeof useMerchActions>;
