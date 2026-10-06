/** WIREFRAME: design.md — transfer negotiation overlay (extracted from App shell). */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { BoardState } from "../../board/board-state.ts";
import type { ClubEventKind } from "../../inbox/club-events.ts";
import type { BoardTarget, ScoutBoard } from "../../scouting/scout-board.ts";
import {
  transferBudget,
  weeklyWageBill,
  formatClubCash,
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
import type { TransferState } from "../../transfers/negotiations.ts";
import { TransferNegotiationModal } from "./TransferNegotiationModal.tsx";

type PatchSession = (updater: (current: GameSession) => GameSession) => void;

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
  negotiationUiPhase: "active" | "won" | "lost";
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
  const [negotiationUiPhase, setNegotiationUiPhase] = useState<"active" | "won" | "lost">("active");
  const [negotiationModalEpoch, setNegotiationModalEpoch] = useState(0);

  const foreignTarget = foreignPlayerId
    ? resolvePurchaseTarget(scoutBoard, foreignPlayerId, rivalPlayers)
    : null;

  const completeNegotiationPurchase = useCallback(
    (playerId: string, fee: number, afterNegotiationState: GameSession) => {
      const purchase = finalizePlayerPurchase(afterNegotiationState, playerId, fee);
      if (purchase.kind === "blocked") {
        setNegotiationMessage(purchase.reason);
        setNegotiationUiPhase("lost");
        return false;
      }
      patchSession((current) =>
        sessionWithEvent(purchase.session, "transfer", purchase.summary),
      );
      const signed = purchase.session.players.find((player) => player.id === playerId);
      setNegotiationMessage(
        t("transfer.negotiation.resolution.won", {
          name: signed ? formatPlayerName(signed) : playerId,
          fee: formatClubCash(fee),
        }),
      );
      setNegotiationUiPhase("won");
      return true;
    },
    [patchSession, sessionWithEvent],
  );

  const handleOpenNegotiation = useCallback(
    (playerId: string) => {
      setNegotiationPlayerId(playerId);
      setNegotiationMessage(null);
      setNegotiationOpenError(null);
      setNegotiationUiPhase("active");
      setNegotiationModalEpoch((epoch) => epoch + 1);
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
            `Verhandlung gescheitert — Spieler-Moral −${round.moralePenalty}.`,
          );
        }
        return { ...current, transferState: round.state };
      });
      if (round.accepted) {
        completeNegotiationPurchase(negotiationPlayerId, fee, afterNeg);
        return;
      }
      setNegotiationMessage(round.message);
      if (round.negotiation.status !== "active") {
        setNegotiationUiPhase("lost");
      }
    },
    [
      completeNegotiationPurchase,
      finances,
      negotiationPlayerId,
      patchSession,
      session,
      sessionWithEvent,
      week,
    ],
  );

  const handleAcceptCounter = useCallback(() => {
    if (!negotiationPlayerId) return;
    const windowReason = cannotSubmitPurchaseOfferReason(week, true);
    if (windowReason) {
      setNegotiationMessage(windowReason);
      return;
    }
    const target = resolvePurchaseTarget(
      session.scoutBoard,
      negotiationPlayerId,
      session.rivalPlayers,
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
    completeNegotiationPurchase(negotiationPlayerId, fee, afterNeg);
  }, [completeNegotiationPurchase, negotiationPlayerId, patchSession, session, week]);

  const foreignProfileTarget = useMemo((): BoardTarget | null => {
    if (foreignTarget) return foreignTarget;
    if (
      foreignPlayerId &&
      negotiationUiPhase === "won" &&
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
      if (negotiationUiPhase === "won" && negotiationPlayerId === foreignPlayerId) {
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
  }, [foreignPlayerId]);

  const dismissNegotiationModal = useCallback(
    (options?: { afterPurchase?: boolean }) => {
      const signedId =
        options?.afterPurchase && negotiationUiPhase === "won" ? negotiationPlayerId : null;
      setNegotiationPlayerId(null);
      setNegotiationMessage(null);
      setNegotiationOpenError(null);
      setNegotiationUiPhase("active");
      if (signedId) {
        setProfileId(signedId);
        setForeignPlayerId(null);
      }
    },
    [negotiationPlayerId, negotiationUiPhase, setForeignPlayerId, setProfileId],
  );

  const negotiationOverlayContext = useMemo(() => {
    if (!negotiationPlayerId) return null;
    const ownedPlayer = players.find((player) => player.id === negotiationPlayerId);
    if (ownedPlayer) {
      return { player: ownedPlayer, estimate: undefined, owned: true as const };
    }
    if (foreignTarget?.player.id === negotiationPlayerId) {
      return {
        player: foreignTarget.player,
        estimate: foreignTarget.estimate,
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
  }, [foreignPlayerId, foreignTarget, negotiationPlayerId, negotiationUiPhase, players]);

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
