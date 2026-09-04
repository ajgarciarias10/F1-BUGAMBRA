import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { ArrowLeft, Check, Download, Share, PlusSquare, MoreVertical, Smartphone, WifiOff, Zap, Bell } from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";

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
      <div className="pointer-events-auto mx-auto flex max-w-lg items-center gap-3 border border-white/15 bg-[#111114]/95 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <img src="/icons/icon-192.png" alt="" className="h-11 w-11 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black uppercase leading-tight tracking-tight text-white">Instala F1 Bugambra</p>
          <p className="text-[11px] leading-snug text-white/50">Gratis, sin tienda de apps y en tu pantalla de inicio.</p>
        </div>
        {canInstall ? (
          <button
            onClick={() => { void install(); dismiss(); }}
            className="min-h-11 shrink-0 bg-[#e10600] px-4 text-[11px] font-black uppercase tracking-[0.12em] text-white active:scale-95"
          >
            Instalar
          </button>
        ) : (
          <Link
            to="/instalar"
            onClick={dismiss}
            className="grid min-h-11 shrink-0 place-items-center bg-white px-4 text-[11px] font-black uppercase tracking-[0.12em] text-black active:scale-95"
          >
            Cómo
          </Link>
        )}
        <button
          onClick={dismiss}
          aria-label="Descartar"
          className="grid min-h-11 w-9 shrink-0 place-items-center text-2xl leading-none text-white/30 active:text-white"
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
      <button
        onClick={() => void install()}
        className={`inline-flex min-h-11 items-center gap-2 bg-[#e10600] px-4 text-[11px] font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#ff241c] ${className}`}
      >
        <Download className="h-4 w-4" /> Instalar app
      </button>
    );
  }

  return (
    <Link
      to="/instalar"
      className={`inline-flex min-h-11 items-center gap-2 border border-current/25 px-4 text-[11px] font-black uppercase tracking-[0.12em] transition-colors hover:border-current/60 ${className}`}
    >
      <Smartphone className="h-4 w-4" /> Instalar app
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
  const [tab, setTab] = useState<"android" | "ios">(platform === "ios" ? "ios" : "android");
  const steps = tab === "ios" ? IOS_STEPS : ANDROID_STEPS;

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] font-sans text-white">
      <header className="safe-top sticky top-0 z-20 flex min-h-14 items-center gap-3 border-b border-white/10 bg-[#0a0a0a]/95 px-4 backdrop-blur-xl">
        <Link to="/" aria-label="Volver" className="-ml-2 grid h-11 w-11 place-items-center text-white/50 active:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="h-5 w-0.5 bg-[#e10600]" />
        <span className="text-sm font-black uppercase tracking-[0.15em]">Instalar la app</span>
      </header>

      <main className="safe-bottom mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center gap-4">
          <img src="/icons/icon-192.png" alt="" className="h-20 w-20 shrink-0 border border-white/10" />
          <div className="min-w-0">
            <h1 className="text-3xl font-black uppercase leading-[0.9] tracking-[-0.04em]">F1 Bugambra</h1>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/40">App gratuita · sin tienda</p>
          </div>
        </div>

        {installed ? (
          <p className="mt-8 flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">
            <Check className="h-5 w-5 shrink-0" /> Ya estás usando la app instalada.
          </p>
        ) : (
          <>
            <p className="mt-6 text-sm leading-relaxed text-white/60">
              F1 Bugambra se instala directamente desde el navegador. No ocupa apenas espacio, no hace falta Play Store
              ni App Store y se actualiza sola.
            </p>

            {canInstall && (
              <button
                onClick={() => void install()}
                className="mt-6 flex min-h-14 w-full items-center justify-center gap-3 bg-[#e10600] text-sm font-black uppercase tracking-[0.15em] text-white transition-colors hover:bg-[#ff241c] active:scale-[0.98]"
              >
                <Download className="h-5 w-5" /> Instalar ahora
              </button>
            )}

            <div className="mt-8">
              <div className="flex border border-white/10">
                {(["android", "ios"] as const).map(value => (
                  <button
                    key={value}
                    onClick={() => setTab(value)}
                    className={`min-h-12 flex-1 text-[11px] font-black uppercase tracking-[0.15em] transition-colors ${
                      tab === value ? "bg-white text-black" : "text-white/40 active:text-white"
                    }`}
                  >
                    {value === "android" ? "Android" : "iPhone / iPad"}
                  </button>
                ))}
              </div>

              <ol className="mt-4 space-y-px bg-white/10">
                {steps.map((step, index) => (
                  <li key={step.title} className="flex gap-4 bg-[#111114] p-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center bg-[#e10600]/15 text-[#e10600]">
                      <step.icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-black uppercase tracking-tight">
                        <span className="mr-2 font-mono text-[#e10600]">{String(index + 1).padStart(2, "0")}</span>
                        {step.title}
                      </p>
                      <p className="mt-1 text-[13px] leading-relaxed text-white/50">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}

        <div className="mt-10 grid gap-px bg-white/10 sm:grid-cols-3">
          {[
            { icon: Zap, title: "Arranque instantáneo", body: "Se abre a pantalla completa, sin barra del navegador." },
            { icon: WifiOff, title: "Aguanta sin cobertura", body: "La última pantalla vista sigue disponible sin conexión." },
            { icon: Bell, title: "Siempre al día", body: "Se actualiza sola cada vez que la abres con datos." },
          ].map(feature => (
            <div key={feature.title} className="bg-[#111114] p-4">
              <feature.icon className="h-5 w-5 text-[#e10600]" />
              <p className="mt-3 text-xs font-black uppercase tracking-tight">{feature.title}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-white/45">{feature.body}</p>
            </div>
          ))}
        </div>

        <Link
          to="/"
          className="mt-8 flex min-h-12 items-center justify-center border border-white/15 text-[11px] font-black uppercase tracking-[0.15em] text-white/60 active:text-white"
        >
          Volver a la liga
        </Link>
      </main>
    </div>
  );
}
