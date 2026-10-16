/** WIREFRAME: design.md — transfer negotiation overlay (extracted from App shell). */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { BoardState } from "../../board/board-state.ts";
import type { ClubEventKind } from "../../inbox/club-events.ts";
import type { BoardTarget, ScoutBoard } from "../../scouting/scout-board.ts";
import {
  transferBudget,
  weeklyWageBill,
  formatClubCash,
  wageBudgetHeadroom,
  type ClubFinances,
} from "../../economy/club-finances.ts";
import { boardCashFloor } from "../../economy/spend-runway.ts";
import { initialEstimateForPlayer } from "../../scouting/market-list.ts";
import { t } from "../../i18n/index.ts";
import type { GameSession } from "../../persistence/game-session.ts";
import { scoutIntelExactForTransfer, scoutMarketValueBounds } from "../../scouting/scout-visibility.ts";
import { isTransferWindowOpen } from "../../sim/transfer-windows.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import type { Player } from "../../types/player.ts";
import {
  acceptCounterOffer,
  activeNegotiation,
  draftNegotiationPreview,
  submitNegotiationRound,
  cannotPayTransferFeeReason,
  cannotSubmitPurchaseOfferReason,
  finalizePlayerPurchase,
  openPurchaseNegotiation,
  resolvePurchaseTarget,
} from "../../transfers/index.ts";
import {
  abortPendingPurchase,
  commitPendingPurchase,
} from "../../transfers/pending-player-purchase.ts";
import {
  defaultContractOffer,
  type ContractOffer,
} from "../../transfers/contract-talks.ts";
import type { TransferState } from "../../transfers/negotiations.ts";
import { applyListedSale, submitSaleRound } from "../../transfers/transfer-listings.ts";
import { TransferNegotiationModal } from "./TransferNegotiationModal.tsx";
import { ContractTalksPanel } from "./ContractTalksPanel.tsx";

type PatchSession = (updater: (current: GameSession) => GameSession) => void;

export type NegotiationUiPhase = "active" | "contract" | "won" | "lost";

export function useTransferNegotiation(args: {
  session: GameSession;
  patchSession: PatchSession;
  sessionWithEvent: (session: GameSession, kind: ClubEventKind, message: string) => GameSession;
  finances: ClubFinances;
  board: BoardState;
  players: readonly Player[];
  scoutBoard: ScoutBoard;
  rivalPlayers: readonly Player[];
  transferState: TransferState;
  season: number;
  week: number;
  foreignPlayerId: string | null;
  setForeignPlayerId: (id: string | null) => void;
  setProfileId: (id: string | null) => void;
  flashNotice: (message: string) => void;
}): {
  handleOpenNegotiation: (playerId: string) => void;
  negotiationOverlay: ReactNode;
  negotiationUiPhase: NegotiationUiPhase;
  foreignProfileTarget: BoardTarget | null;
} {
  const {
    session,
    patchSession,
    sessionWithEvent,
    finances,
    board,
    players,
    scoutBoard,
    rivalPlayers,
    transferState,
    season,
    week,
    foreignPlayerId,
    setForeignPlayerId,
    setProfileId,
    flashNotice,
  } = args;

  const [negotiationPlayerId, setNegotiationPlayerId] = useState<string | null>(null);
  const [negotiationMessage, setNegotiationMessage] = useState<string | null>(null);
  const [negotiationOpenError, setNegotiationOpenError] = useState<string | null>(null);
  const [negotiationUiPhase, setNegotiationUiPhase] = useState<NegotiationUiPhase>("active");
  const [negotiationModalEpoch, setNegotiationModalEpoch] = useState(0);
  const [agreedFee, setAgreedFee] = useState<number | null>(null);
  const [contractOffer, setContractOffer] = useState<ContractOffer | null>(null);

  const foreignTarget = foreignPlayerId
    ? resolvePurchaseTarget(scoutBoard, foreignPlayerId, rivalPlayers, transferState)
    : null;

  const stageFeeAgreement = useCallback(
    (playerId: string, fee: number, afterNegotiationState: GameSession) => {
      const purchase = finalizePlayerPurchase(afterNegotiationState, playerId, fee);
      if (purchase.kind === "blocked") {
        setNegotiationMessage(purchase.reason);
        setNegotiationUiPhase("lost");
        return false;
      }
      patchSession((current) =>
        sessionWithEvent(
          { ...current, transferState: purchase.session.transferState },
          "transfer",
          t("transfer.purchase.feeAgreed"),
        ),
      );
      const target = resolvePurchaseTarget(
        purchase.session.scoutBoard,
        playerId,
        purchase.session.rivalPlayers,
        purchase.session.transferState,
      );
      if (target) {
        setContractOffer(defaultContractOffer(target.player, season));
      }
      setAgreedFee(fee);
      setNegotiationMessage(t("transfer.purchase.contractRequiredHint"));
      setNegotiationUiPhase("contract");
      return true;
    },
    [patchSession, season, sessionWithEvent],
  );

  const abortPendingDeal = useCallback(
    (playerId: string) => {
      patchSession((current) => {
        const aborted = abortPendingPurchase(current, playerId);
        return sessionWithEvent(aborted.session, "transfer", aborted.summary);
      });
      setNegotiationMessage(t("transfer.purchase.dealCollapsed"));
      setNegotiationUiPhase("lost");
      setAgreedFee(null);
      setContractOffer(null);
    },
    [patchSession, sessionWithEvent],
  );

  const handleOpenNegotiation = useCallback(
    (playerId: string) => {
      setNegotiationPlayerId(playerId);
      setNegotiationMessage(null);
      setNegotiationOpenError(null);
      setNegotiationUiPhase("active");
      setAgreedFee(null);
      setContractOffer(null);
      setNegotiationModalEpoch((epoch) => epoch + 1);
      const existingSale = activeNegotiation(session.transferState, playerId);
      if (existingSale?.side === "sell") return;
      const result = openPurchaseNegotiation({
        scoutBoard: session.scoutBoard,
        rivalPlayers: session.rivalPlayers,
        transferState: session.transferState,
        playerId,
        season: session.season,
        week: session.week,
      });
      if (result.kind === "blocked") {
        setNegotiationOpenError(result.reason);
        return;
      }
      setNegotiationOpenError(null);
      patchSession((current) => ({ ...current, transferState: result.transferState }));
    },
    [
      patchSession,
      session.scoutBoard,
      session.rivalPlayers,
      session.season,
      session.transferState,
      session.week,
    ],
  );

  const handleNegotiationOffer = useCallback(
    (fee: number) => {
      if (!negotiationPlayerId) return;
      const active = activeNegotiation(session.transferState, negotiationPlayerId);
      if (active?.side === "sell") {
        let round;
        try {
          round = submitSaleRound(session.transferState, negotiationPlayerId, fee);
        } catch {
          setNegotiationMessage(t("transfer.purchase.negotiationFailed"));
          setNegotiationUiPhase("lost");
          return;
        }
        patchSession((current) => {
          if (!round.accepted) return { ...current, transferState: round.state };
          const sold = applyListedSale({
            players: current.players,
            rivalPlayers: current.rivalPlayers,
            finances: current.finances,
            transferState: round.state,
            playerId: negotiationPlayerId,
            fee: round.negotiation.current_offer,
            buyerClubId: active.buyer_club_id ?? "cl_ai",
            season: current.season,
            week: current.week,
            userClubId: current.clubId,
            boardCashFloor: boardCashFloor(board),
          });
          return sessionWithEvent(
            {
              ...current,
              players: sold.players,
              rivalPlayers: sold.rivalPlayers,
              finances: sold.finances,
              transferState: sold.transferState,
            },
            "transfer",
            round.message,
          );
        });
        setNegotiationMessage(round.message);
        setNegotiationUiPhase(round.accepted || round.negotiation.status !== "active" ? (round.accepted ? "won" : "lost") : "active");
        return;
      }
      const windowReason = cannotSubmitPurchaseOfferReason(week, true);
      if (windowReason) {
        setNegotiationMessage(windowReason);
        return;
      }
      const payReason = cannotPayTransferFeeReason(finances, fee);
      if (payReason) {
        setNegotiationMessage(payReason);
        return;
      }
      const target = resolvePurchaseTarget(
        session.scoutBoard,
        negotiationPlayerId,
        session.rivalPlayers,
        session.transferState,
      );
      if (!target) {
        setNegotiationMessage(t("transfer.purchase.targetUnavailable"));
        return;
      }
      if (!scoutIntelExactForTransfer(target.player, target.estimate, session.season)) {
        setNegotiationMessage(t("transfer.negotiation.submitDisabledScout"));
        return;
      }
      let round;
      try {
        round = submitNegotiationRound(session.transferState, negotiationPlayerId, fee);
      } catch {
        setNegotiationMessage(t("transfer.purchase.negotiationFailed"));
        setNegotiationUiPhase("lost");
        return;
      }
      const afterNeg = { ...session, transferState: round.state };
      patchSession((current) => {
        if (round.moralePenalty) {
          return sessionWithEvent(
            { ...current, transferState: round.state },
            "transfer",
            t("clubEvent.negotiationMoralePenalty", { amount: round.moralePenalty }),
          );
        }
        return { ...current, transferState: round.state };
      });
      if (round.accepted) {
        stageFeeAgreement(negotiationPlayerId, fee, afterNeg);
        return;
      }
      setNegotiationMessage(round.message);
      if (round.negotiation.status !== "active") {
        setNegotiationUiPhase("lost");
      }
    },
    [
      finances,
      negotiationPlayerId,
      patchSession,
      session,
      sessionWithEvent,
      stageFeeAgreement,
      week,
    ],
  );

  const handleAcceptCounter = useCallback(() => {
    if (!negotiationPlayerId) return;
    const active = activeNegotiation(session.transferState, negotiationPlayerId);
    if (active?.side === "sell") {
      handleNegotiationOffer(active.counter_offer ?? active.current_offer);
      return;
    }
    const windowReason = cannotSubmitPurchaseOfferReason(week, true);
    if (windowReason) {
      setNegotiationMessage(windowReason);
      return;
    }
    const target = resolvePurchaseTarget(
      session.scoutBoard,
      negotiationPlayerId,
      session.rivalPlayers,
      session.transferState,
    );
    if (target && !scoutIntelExactForTransfer(target.player, target.estimate, session.season)) {
      setNegotiationMessage(t("transfer.negotiation.submitDisabledScout"));
      return;
    }
    let round;
    try {
      round = acceptCounterOffer(session.transferState, negotiationPlayerId);
    } catch {
      setNegotiationMessage(t("transfer.negotiation.noCounter"));
      setNegotiationUiPhase("lost");
      return;
    }
    const fee = round.negotiation.current_offer;
    const afterNeg = { ...session, transferState: round.state };
    patchSession((current) => ({ ...current, transferState: round.state }));
    if (!round.accepted) {
      setNegotiationMessage(round.message);
      setNegotiationUiPhase("lost");
      return;
    }
    stageFeeAgreement(negotiationPlayerId, fee, afterNeg);
  }, [handleNegotiationOffer, negotiationPlayerId, patchSession, session, stageFeeAgreement, week]);

  const handleContractSubmit = useCallback(() => {
    if (!negotiationPlayerId || !contractOffer) return;
    patchSession((current) => {
      const result = commitPendingPurchase(current, negotiationPlayerId, contractOffer);
      if (result.kind === "blocked") {
        setNegotiationMessage(result.reason);
        return current;
      }
      if (result.kind === "contract_rejected") {
        setNegotiationMessage(result.message);
        if (result.abort) {
          queueMicrotask(() => abortPendingDeal(negotiationPlayerId));
        }
        return result.session;
      }
      setNegotiationUiPhase("won");
      setNegotiationMessage(
        t("transfer.negotiation.resolution.won", {
          name: formatPlayerName(
            result.session.players.find((player) => player.id === negotiationPlayerId)!,
          ),
          fee: formatClubCash(agreedFee ?? 0),
        }),
      );
      return sessionWithEvent(result.session, "transfer", result.summary);
    });
  }, [
    abortPendingDeal,
    agreedFee,
    contractOffer,
    negotiationPlayerId,
    patchSession,
    sessionWithEvent,
  ]);

  const foreignProfileTarget = useMemo((): BoardTarget | null => {
    if (foreignTarget) return foreignTarget;
    if (
      foreignPlayerId &&
      (negotiationUiPhase === "won" || negotiationUiPhase === "contract") &&
      negotiationPlayerId === foreignPlayerId
    ) {
      const signed = players.find((player) => player.id === foreignPlayerId);
      if (signed) {
        return {
          player: signed,
          estimate: initialEstimateForPlayer(signed, 0),
          assigned: false,
        };
      }
    }
    return null;
  }, [foreignPlayerId, foreignTarget, negotiationPlayerId, negotiationUiPhase, players]);

  useEffect(() => {
    if (!foreignPlayerId || foreignTarget) return;
    if (players.some((player) => player.id === foreignPlayerId)) {
      if (
        (negotiationUiPhase === "won" || negotiationUiPhase === "contract") &&
        negotiationPlayerId === foreignPlayerId
      ) {
        return;
      }
      setForeignPlayerId(null);
      setProfileId(foreignPlayerId);
      return;
    }
    flashNotice(t("transfer.purchase.profileUnavailable"));
    setForeignPlayerId(null);
  }, [
    flashNotice,
    foreignPlayerId,
    foreignTarget,
    negotiationPlayerId,
    negotiationUiPhase,
    players,
    setForeignPlayerId,
    setProfileId,
  ]);

  useEffect(() => {
    setNegotiationPlayerId(null);
    setNegotiationMessage(null);
    setNegotiationOpenError(null);
    setNegotiationUiPhase("active");
    setAgreedFee(null);
    setContractOffer(null);
  }, [foreignPlayerId]);

  const dismissNegotiationModal = useCallback(
    (options?: { afterPurchase?: boolean }) => {
      if (negotiationPlayerId && negotiationUiPhase === "contract") {
        abortPendingDeal(negotiationPlayerId);
      }
      const signedId =
        options?.afterPurchase && negotiationUiPhase === "won" ? negotiationPlayerId : null;
      setNegotiationPlayerId(null);
      setNegotiationMessage(null);
      setNegotiationOpenError(null);
      setNegotiationUiPhase("active");
      setAgreedFee(null);
      setContractOffer(null);
      if (signedId) {
        setProfileId(signedId);
        setForeignPlayerId(null);
      }
    },
    [abortPendingDeal, negotiationPlayerId, negotiationUiPhase, setForeignPlayerId, setProfileId],
  );

  const negotiationOverlayContext = useMemo(() => {
    if (!negotiationPlayerId) return null;
    const ownedPlayer = players.find((player) => player.id === negotiationPlayerId);
    if (ownedPlayer) {
      return { player: ownedPlayer, estimate: undefined, owned: true as const };
    }
    const pendingTarget = resolvePurchaseTarget(
      scoutBoard,
      negotiationPlayerId,
      rivalPlayers,
      transferState,
    );
    if (pendingTarget?.player.id === negotiationPlayerId) {
      return {
        player: pendingTarget.player,
        estimate: pendingTarget.estimate,
        owned: false as const,
      };
    }
    if (negotiationUiPhase === "won" && foreignPlayerId === negotiationPlayerId) {
      const signed = players.find((player) => player.id === negotiationPlayerId);
      if (signed) {
        return { player: signed, estimate: undefined, owned: true as const };
      }
    }
    return null;
  }, [
    foreignPlayerId,
    negotiationPlayerId,
    negotiationUiPhase,
    players,
    rivalPlayers,
    scoutBoard,
  ]);

  const headroom = wageBudgetHeadroom(finances, players, session.clubId);

  const negotiationOverlay = negotiationOverlayContext ? (
    <TransferNegotiationModal
      key={negotiationModalEpoch}
      player={negotiationOverlayContext.player}
      negotiation={
        activeNegotiation(transferState, negotiationPlayerId!) ??
        draftNegotiationPreview(negotiationOverlayContext.player, season, week)
      }
      transferBudget={transferBudget(finances)}
      finances={finances}
      weeklyWageBill={weeklyWageBill(players, session.clubId)}
      boardCashFloor={boardCashFloor(board)}
      transferWindowOpen={isTransferWindowOpen(week)}
      week={week}
      season={season}
      scoutEstimate={negotiationOverlayContext.estimate}
      openError={negotiationOpenError}
      valueBounds={
        negotiationOverlayContext.owned
          ? {
              low: negotiationOverlayContext.player.market_value,
              high: negotiationOverlayContext.player.market_value,
              exact: true,
            }
          : negotiationOverlayContext.estimate
            ? scoutMarketValueBounds(
                negotiationOverlayContext.player,
                negotiationOverlayContext.estimate,
                season,
                false,
              )
            : null
      }
      message={negotiationMessage}
      onSubmitOffer={handleNegotiationOffer}
      onAcceptCounter={handleAcceptCounter}
      uiPhase={negotiationUiPhase}
      agreedFee={agreedFee ?? undefined}
      contractPanel={
        negotiationUiPhase === "contract" && contractOffer ? (
          <ContractTalksPanel
            compactTitle
            player={negotiationOverlayContext.player}
            season={season}
            offer={contractOffer}
            wageHeadroomWeekly={headroom}
            onChange={setContractOffer}
            onSubmit={handleContractSubmit}
            onCancel={() => {
              if (negotiationPlayerId) abortPendingDeal(negotiationPlayerId);
            }}
          />
        ) : undefined
      }
      onContinueTalk={() => {
        setNegotiationUiPhase("active");
        setNegotiationMessage(null);
      }}
      onWalkAway={() => {
        dismissNegotiationModal({ afterPurchase: negotiationUiPhase === "won" });
      }}
    />
  ) : null;

  return {
    handleOpenNegotiation,
    negotiationOverlay,
    negotiationUiPhase,
    foreignProfileTarget,
  };
}
