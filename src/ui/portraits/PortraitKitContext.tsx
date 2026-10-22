import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { WorldClub } from "../../world/world-generator.ts";
import { worldCareerClubId } from "../../world/world-generator.ts";
import { teamColorsForKit, type TeamColors } from "./face-from-seed.ts";

/** Career club id → faces.js team colours from the club's home kit (PRD 26). */
const PortraitKitContext = createContext<ReadonlyMap<string, TeamColors>>(new Map());

export function PortraitKitProvider({
  worldClubs,
  children,
}: {
  worldClubs: readonly WorldClub[];
  children: ReactNode;
}) {
  const colorsByCareerClubId = useMemo(() => {
    const map = new Map<string, TeamColors>();
    for (const club of worldClubs) {
      if (club.kit?.primary) {
        map.set(worldCareerClubId(club.id), teamColorsForKit(club.kit));
      }
    }
    return map;
  }, [worldClubs]);

  return <PortraitKitContext.Provider value={colorsByCareerClubId}>{children}</PortraitKitContext.Provider>;
}

export function usePortraitTeamColors(careerClubId: string | null | undefined): TeamColors | undefined {
  const map = useContext(PortraitKitContext);
  if (!careerClubId) return undefined;
  return map.get(careerClubId);
}
