import React from "react";
import { createRoot } from "react-dom/client";
import Home from "../app/page";
import { LanguageProvider } from "../app/i18n";
import "../app/styles.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LanguageProvider>
      <Home />
    </LanguageProvider>
  </React.StrictMode>,
);
