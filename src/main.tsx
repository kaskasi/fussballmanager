import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AppErrorBoundary } from "./ui/components/AppErrorBoundary.tsx";
import { isStoryboardPocUrl, StoryboardPocScreen } from "./ui/screens/StoryboardPocScreen.tsx";
import "./ui/design/design-tokens.css";
import "./ui/layout/screen-layout.css";
import "./ui/layout/mobile-pass.css";
import "./index.css";
import "./ui/design/design-repair.css";
import "./ui/design/game-surfaces.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root");
}

const poc = isStoryboardPocUrl();

createRoot(root).render(
  <StrictMode>
    {poc ? (
      <StoryboardPocScreen />
    ) : (
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    )}
  </StrictMode>,
);
