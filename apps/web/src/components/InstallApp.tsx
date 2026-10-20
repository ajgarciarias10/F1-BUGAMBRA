import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { ArrowLeft, Check, Download, Share, PlusSquare, MoreVertical, Smartphone, WifiOff, Zap, Bell } from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";
import { usePageBackground } from "../hooks/usePageBackground";
import { Button, Card, Notice, buttonClass } from "./ui";

const DISMISS_KEY = "f1-install-banner-dismissed";

// ── BANNER FLOTANTE ────────────────────────────────────────────────────────────
// Aparece una sola vez por dispositivo hasta que se descarta. Se sitúa por encima
// de la barra de pestañas inferior, nunca tapándola.

export function InstallBanner() {
  const { canInstall, installed, platform, install } = usePWAInstall();
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* modo privado */ }
  };

  // En iOS nunca hay evento de instalación: se ofrece la guía manual.
  // En /instalar y /login el banner sobra: la primera ya es la guía y la segunda
  // necesita la pantalla libre para el formulario.
  const enPantallaPropia = pathname === "/instalar" || pathname === "/login";
  const showable = !installed && !dismissed && !enPantallaPropia && (canInstall || platform === "ios");
  if (!showable) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(var(--tabbar-height,0px)+0.75rem)] z-[60] px-3 pointer-events-none">
      <div role="region" aria-label="Instalar la app" className="acrylic pointer-events-auto mx-auto flex max-w-lg items-center gap-3 rounded-card p-3">
        <img src="/icons/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight text-ink">Instala F1 Bugambra</p>
          <p className="text-xs leading-snug text-ink-muted">Gratis, sin tienda de apps y en tu pantalla de inicio.</p>
        </div>
        {canInstall ? (
          <Button variant="primary" size="sm" onClick={() => { void install(); dismiss(); }} className="shrink-0">
            Instalar
          </Button>
        ) : (
          <Link
            to="/instalar"
            onClick={dismiss}
            className={buttonClass({ size: "sm" }) + " shrink-0"}
          >
            Cómo
          </Link>
        )}
        <button
          onClick={dismiss}
          aria-label="Descartar"
          className="grid min-h-11 w-11 shrink-0 place-items-center rounded-lg text-2xl leading-none text-ink-muted hover:bg-info/10 hover:text-ink"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// ── BOTÓN REUTILIZABLE ─────────────────────────────────────────────────────────

export function InstallButton({ className = "" }: { className?: string }) {
  const { canInstall, installed, install } = usePWAInstall();
  if (installed) return null;

  if (canInstall) {
    return (
      <Button variant="primary" onClick={() => void install()} className={className}>
        <Download aria-hidden="true" className="h-4 w-4" /> Instalar app
      </Button>
    );
  }

  return (
    <Link
      to="/instalar"
      className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-current/30 px-4 text-sm font-semibold fluent-press hover:border-current/60 hover:bg-info/10 ${className}`}
    >
      <Smartphone aria-hidden="true" className="h-4 w-4" /> Instalar app
    </Link>
  );
}

// ── PÁGINA /instalar ───────────────────────────────────────────────────────────

const ANDROID_STEPS = [
  { icon: MoreVertical, title: "Abre el menú de Chrome", body: "Pulsa los tres puntos ⋮ arriba a la derecha del navegador." },
  { icon: PlusSquare, title: "Añadir a pantalla de inicio", body: "Elige «Instalar aplicación» o «Añadir a pantalla de inicio»." },
  { icon: Check, title: "Confirma", body: "Pulsa «Instalar». El icono de F1 Bugambra aparecerá con el resto de tus apps." },
];

const IOS_STEPS = [
  { icon: Share, title: "Pulsa Compartir", body: "En Safari, toca el icono de compartir (el cuadrado con la flecha hacia arriba)." },
  { icon: PlusSquare, title: "Añadir a inicio", body: "Desliza la lista y elige «Añadir a pantalla de inicio»." },
  { icon: Check, title: "Añadir", body: "Pulsa «Añadir» arriba a la derecha. Debe hacerse desde Safari: Chrome en iPhone no puede instalar apps." },
];

export function InstallApp() {
  const { canInstall, installed, platform, install } = usePWAInstall();
  usePageBackground("var(--c-bg)");
  const [tab, setTab] = useState<"android" | "ios">(platform === "ios" ? "ios" : "android");
  const steps = tab === "ios" ? IOS_STEPS : ANDROID_STEPS;

  return (
    <div className="min-h-[100dvh] bg-bg font-sans text-ink">
      <header className="safe-top sticky top-0 z-20 flex min-h-14 items-center gap-3 acrylic-bar border-b px-4">
        <Link to="/" aria-label="Volver" className="-ml-2 grid h-11 w-11 place-items-center rounded-lg text-ink-muted hover:bg-info/10 hover:text-ink">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span aria-hidden="true" className="h-5 w-1 rounded-full bg-brand" />
        <span className="text-sm font-semibold">Instalar la app</span>
      </header>

      <main className="safe-bottom mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center gap-4">
          <img src="/icons/icon-192.png" alt="" className="h-20 w-20 shrink-0 rounded-2xl border border-line shadow-fluent-2" />
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight">F1 Bugambra</h1>
            <p className="mt-1 text-sm text-ink-muted">App gratuita · sin tienda</p>
          </div>
        </div>

        {installed ? (
          <Notice tone="ok" className="mt-8">Ya estás usando la app instalada.</Notice>
        ) : (
          <>
            <p className="mt-6 text-sm leading-relaxed text-ink-muted">
              F1 Bugambra se instala directamente desde el navegador. No ocupa apenas espacio, no hace falta Play Store
              ni App Store y se actualiza sola.
            </p>

            {canInstall && (
              <Button variant="primary" block onClick={() => void install()} className="mt-6 min-h-14 text-base">
                <Download aria-hidden="true" className="h-5 w-5" /> Instalar ahora
              </Button>
            )}

            <div className="mt-8">
              <div role="group" aria-label="Plataforma" className="flex gap-1 rounded-lg border border-line bg-surface-2/70 p-1">
                {(["android", "ios"] as const).map(value => (
                  <button
                    key={value}
                    onClick={() => setTab(value)}
                    aria-pressed={tab === value}
                    className={`min-h-11 flex-1 rounded-md text-sm font-semibold transition-colors ${
                      tab === value ? "bg-surface text-ink shadow-fluent-1" : "text-ink-muted hover:bg-info/10 hover:text-ink"
                    }`}
                  >
                    {value === "android" ? "Android" : "iPhone / iPad"}
                  </button>
                ))}
              </div>

              <ol className="mt-4 space-y-3">
                {steps.map((step, index) => (
                  <Card as="li" key={step.title} tone="solid" pad="sm" className="flex gap-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                      <step.icon aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        <span className="mr-2 text-brand">{String(index + 1).padStart(2, "0")}</span>
                        {step.title}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-ink-muted">{step.body}</p>
                    </div>
                  </Card>
                ))}
              </ol>
            </div>
          </>
        )}

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Zap, title: "Arranque instantáneo", body: "Se abre a pantalla completa, sin barra del navegador." },
            { icon: WifiOff, title: "Aguanta sin cobertura", body: "La última pantalla vista sigue disponible sin conexión." },
            { icon: Bell, title: "Siempre al día", body: "Se actualiza sola cada vez que la abres con datos." },
          ].map(feature => (
            <Card key={feature.title} tone="muted" pad="sm">
              <feature.icon aria-hidden="true" className="h-5 w-5 text-info" />
              <p className="mt-3 text-sm font-semibold text-ink">{feature.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">{feature.body}</p>
            </Card>
          ))}
        </div>

        <Link
          to="/"
          className={buttonClass({ block: true }) + " mt-8"}
        >
          Volver a la liga
        </Link>
      </main>
    </div>
  );
}
