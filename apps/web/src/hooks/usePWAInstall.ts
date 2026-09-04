import { useCallback, useEffect, useState } from "react";

// Chrome/Edge/Samsung disparan este evento cuando la app cumple los criterios de
// instalación. No está en lib.dom todavía, así que lo tipamos aquí.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt: () => Promise<void>;
}

export type InstallPlatform = "android" | "ios" | "desktop";

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const subscribers = new Set<(event: BeforeInstallPromptEvent | null) => void>();

function setDeferredPrompt(event: BeforeInstallPromptEvent | null) {
  deferredPrompt = event;
  subscribers.forEach(notify => notify(event));
}

// Se escucha a nivel de módulo: el evento suele llegar antes de que React monte,
// y sin capturarlo aquí se perdería y el botón de instalar nunca aparecería.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    setDeferredPrompt(event as BeforeInstallPromptEvent);
  });
  window.addEventListener("appinstalled", () => setDeferredPrompt(null));
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    // iOS no soporta display-mode y expone esta propiedad no estándar.
    (navigator as any).standalone === true
  );
}

export function detectPlatform(): InstallPlatform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  // iPadOS 13+ se anuncia como Macintosh; el touch lo delata.
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export function usePWAInstall() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(deferredPrompt);
  const [installed, setInstalled] = useState(isStandalone);
  const platform = detectPlatform();

  useEffect(() => {
    subscribers.add(setPrompt);
    const onInstalled = () => setInstalled(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      subscribers.delete(setPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return "unavailable" as const;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    // El evento es de un solo uso: una vez consumido hay que soltarlo.
    if (outcome === "accepted") setDeferredPrompt(null);
    return outcome;
  }, []);

  return {
    /** true cuando el navegador puede lanzar el diálogo nativo de instalación. */
    canInstall: !!prompt && !installed,
    /** true cuando la app ya se abre como aplicación instalada. */
    installed,
    platform,
    install,
  };
}
