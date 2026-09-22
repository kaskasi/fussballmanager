import { useState } from "react";
import { Matchday } from "./match/Matchday";
import { PipelineDashboard } from "./ui/screens/PipelineDashboard";
import { YouthCampus } from "./ui/screens/YouthCampus";

type Screen = "hub" | "campus" | "matchday";

export default function App() {
  const [screen, setScreen] = useState<Screen>("hub");
  return (
    <>
      <nav className="app-nav" aria-label="Bereiche">
        <button
          type="button"
          aria-pressed={screen === "hub"}
          aria-label="Pipeline"
          title="Pipeline"
          onClick={() => setScreen("hub")}
        >
          ●
        </button>
        <button
          type="button"
          aria-pressed={screen === "campus"}
          aria-label="Jugend"
          title="Jugend"
          onClick={() => setScreen("campus")}
        >
          🏫
        </button>
        <button
          type="button"
          aria-pressed={screen === "matchday"}
          aria-label="Matchday"
          title="Matchday"
          onClick={() => setScreen("matchday")}
        >
          ⚽
        </button>
      </nav>
      <div hidden={screen !== "hub"}>
        <PipelineDashboard onOpenYouth={() => setScreen("campus")} />
      </div>
      {screen === "campus" ? <YouthCampus /> : null}
      {screen === "matchday" ? <Matchday /> : null}
    </>
  );
}
