import { createContext, useContext, type ReactNode } from "react";
import type { GameSession } from "../../persistence/game-session.ts";
import type { PersistedSession } from "./usePersistedGameSession.ts";

export type PatchSession = (recipe: (current: PersistedSession) => PersistedSession) => void;

export interface GameSessionContextValue {
  session: GameSession;
  patchSession: PatchSession;
  flashNotice: (text: string, tone?: "ok" | "warn") => void;
}

const GameSessionContext = createContext<GameSessionContextValue | null>(null);

export function GameSessionProvider({
  value,
  children,
}: {
  value: GameSessionContextValue;
  children: ReactNode;
}) {
  return <GameSessionContext.Provider value={value}>{children}</GameSessionContext.Provider>;
}

export function useGameSession(): GameSessionContextValue {
  const ctx = useContext(GameSessionContext);
  if (!ctx) {
    throw new Error("useGameSession must be used within GameSessionProvider");
  }
  return ctx;
}
