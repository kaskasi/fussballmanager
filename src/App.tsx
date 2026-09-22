import { useState } from "react";
import { Matchday } from "./match/Matchday";
import { YouthCampus } from "./ui/screens/YouthCampus";

export default function App() {
  const [screen, setScreen] = useState<"campus" | "matchday">("campus");
  return (
    <>
      <nav className="app-nav" aria-label="Bereiche">
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
      {screen === "campus" ? <YouthCampus /> : <Matchday />}
    </>
  );
}
