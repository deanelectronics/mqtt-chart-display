import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { Dashboard } from "./routes/index";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Static root element #root saknas");
}

createRoot(root).render(
  <StrictMode>
    <Dashboard />
  </StrictMode>,
);