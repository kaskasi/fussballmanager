import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./ui/design/design-tokens.css";
import "./ui/layout/screen-layout.css";
import "./index.css";
import "./ui/design/design-repair.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
