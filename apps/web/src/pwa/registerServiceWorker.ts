/**
 * Registro del service worker que hace instalable la app.
 *
 * Solo se registra en producción: en desarrollo un SW cacheando módulos de Vite
 * provoca recargas con código viejo, así que allí lo desregistramos activamente
 * para limpiar instalaciones previas.
 */
export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  if (!import.meta.env.PROD) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => registration.unregister());
    });
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(registration => {
        // Si hay una versión nueva esperando, la activamos sin pedir nada al usuario.
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              installing.postMessage("SKIP_WAITING");
            }
          });
        });
      })
      .catch(error => {
        console.warn("No se pudo registrar el service worker:", error);
      });
  });
}
