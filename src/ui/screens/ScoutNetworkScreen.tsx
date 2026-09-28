/** WIREFRAME: PRD 09 — F4.3 Scout-Netzwerk (eigener Screen) */
import { formatClubCash } from "../../economy/club-finances.ts";
import {
  scoutNetworkAccuracyModifier,
  scoutNetworkCapacity,
  scoutNetworkWeeklyWage,
  type HiredScout,
  type ScoutNetworkState,
} from "../../scouting/scout-network.ts";
import { ScoutNetworkPanel } from "../components/ScoutNetworkPanel.tsx";

export function ScoutNetworkScreen({
  network,
  season,
  week,
  masterSeed,
  cash,
  onHire,
  onFire,
  onBack,
}: {
  network: ScoutNetworkState;
  season: number;
  week: number;
  masterSeed: number;
  cash: number;
  onHire: (scout: HiredScout) => void;
  onFire: (scoutId: string) => void;
  onBack: () => void;
}) {
  const capacity = scoutNetworkCapacity(network);
  const accuracy = scoutNetworkAccuracyModifier(network);
  const wage = scoutNetworkWeeklyWage(network);

  return (
    <main className="scouting scouting-network-screen">
      <header className="scouting-head">
        <button type="button" onClick={onBack} aria-label="Zurück zur Marktliste">
          ←
        </button>
        <div>
          <p className="eyebrow">Scouting</p>
          <h1>Scout-Netzwerk</h1>
          <p className="scouting-scouts">
            {network.scouts.length} Scouts · Kapazität {capacity} · Genauigkeit ×{accuracy.toFixed(2)} ·{" "}
            {formatClubCash(wage)}/Woche
          </p>
        </div>
      </header>

      <ScoutNetworkPanel
        network={network}
        season={season}
        week={week}
        masterSeed={masterSeed}
        cash={cash}
        onHire={onHire}
        onFire={onFire}
        showHead={false}
      />
    </main>
  );
}
