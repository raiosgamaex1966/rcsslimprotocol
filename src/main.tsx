import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

/* Registro e Auto-Atualização do Service Worker (PWA) — apenas em produção */
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => {
        // Força checagem imediata de nova versão no servidor
        reg.update();

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // Nova versão detectada e instalada; recarrega a página automaticamente
                window.location.reload();
              }
            });
          }
        });
      })
      .catch(() => {
        // sem SW em ambiente de desenvolvimento / preview
      });
  });
}
