import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { WorldClub } from "../../world/world-generator.ts";
import { worldCareerClubId } from "../../world/world-generator.ts";

const PortraitKitContext = createContext<ReadonlyMap<string, string>>(new Map());

export function PortraitKitProvider({
  worldClubs,
  children,
}: {
  worldClubs: readonly WorldClub[];
  children: ReactNode;
}) {
  const kitPrimaryByCareerClubId = useMemo(() => {
    const map = new Map<string, string>();
    for (const club of worldClubs) {
      const primary = club.kit?.primary;
      if (primary) {
        map.set(worldCareerClubId(club.id), primary);
      }
    }
    return map;
  }, [worldClubs]);

  return (
    <PortraitKitContext.Provider value={kitPrimaryByCareerClubId}>
      {children}
    </PortraitKitContext.Provider>
  );
}

export function usePortraitKitPrimary(careerClubId: string | null | undefined): string | undefined {
  const map = useContext(PortraitKitContext);
  if (!careerClubId) return undefined;
  return map.get(careerClubId);
}
