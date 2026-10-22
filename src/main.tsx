import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AppErrorBoundary } from "./ui/components/AppErrorBoundary.tsx";
import { isStoryboardPocUrl, StoryboardPocScreen } from "./ui/screens/StoryboardPocScreen.tsx";
import { isUiGalleryUrl } from "./ui/dev/ui-gallery-route.ts";
import "./ui/design/design-tokens.css";
import "./ui/design/global-base.css";
import "./ui/design/components.css";
import "./ui/layout/screen-layout.css";
import "./ui/design/game-surfaces.css";
import "./ui/design/surfaces/finances.css";
import "./ui/design/surfaces/stadium.css";
import "./ui/design/surfaces/calendar.css";
import "./ui/design/surfaces/training.css";
import "./ui/design/surfaces/scouting.css";
import "./ui/design/surfaces/hub-desk.css";
import "./ui/design/surfaces/profile.css";
import "./ui/design/surfaces/transfers.css";
import "./ui/design/surfaces/merch.css";
import "./ui/design/presentation-modes.css";
import "./index.css";
import "./ui/layout/mobile-pass.css";
import "./ui/design/design-repair.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root");
}

const poc = isStoryboardPocUrl();
const uiGallery = isUiGalleryUrl();
const UiGallery = lazy(() => import("./ui/dev/UiGallery.tsx"));

createRoot(root).render(
  <StrictMode>
    {poc ? (
      <StoryboardPocScreen />
    ) : uiGallery ? (
      <Suspense fallback={null}>
        <UiGallery />
      </Suspense>
    ) : (
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    )}
  </StrictMode>,
);
