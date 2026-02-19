import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import TailInequalitiesV4 from "./TailInequalitiesVisualization.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <TailInequalitiesV4 />
  </StrictMode>
);
