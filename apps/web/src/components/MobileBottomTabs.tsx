import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Ellipsis,
  Flag,
  Images,
  Lightbulb,
  type LucideIcon,
  MessagesSquare,
  MonitorPlay,
  Shield,
  Store,
  Trophy,
  User,
  X,
} from "lucide-react";

export interface MobileTabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
}

// Iconos por id de pestaña: así ninguna pantalla que ya usaba este componente
// necesita cambiar para tener icono, pero puede pasar el suyo si quiere.
const ICONS: Record<string, LucideIcon> = {
  clasificacion: BarChart3,
  championship: Trophy,
  acumulado: Trophy,
  equipos: Shield,
  resultados: Flag,
  market: Store,
  paddock: MessagesSquare,
  profile: User,
  suggestions: Lightbulb,
  album: Images,
  tv: MonitorPlay,
};

/** Nº de pestañas visibles en la barra. Con más, la última pasa a ser «Más». */
const MAX_VISIBLE = 5;

// Etiquetas cortas para que quepan en una columna de ~4rem sin cortarse.
const SHORT_LABELS: Record<string, string> = {
  clasificacion: "Clasific.",
  championship: "Mundial",
  resultados: "Result.",
  suggestions: "Mejoras",
  acumulado: "Ranking",
};

function iconFor(tab: MobileTabItem): LucideIcon {
  return tab.icon || ICONS[tab.id] || Flag;
}

export function MobileBottomTabs({
  tabs,
  activeTab,
  onTab,
}: {
  tabs: MobileTabItem[];
  activeTab: string;
  onTab: (id: string) => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const { visible, overflow } = useMemo(() => {
    if (tabs.length <= MAX_VISIBLE) return { visible: tabs, overflow: [] as MobileTabItem[] };

    // Con desbordamiento, el último hueco lo ocupa el botón «Más».
    const slots = MAX_VISIBLE - 1;
    const primary = tabs.slice(0, slots);
    const rest = tabs.slice(slots);

    const activeInRest = rest.find(tab => tab.id === activeTab);
    if (!activeInRest) return { visible: primary, overflow: rest };

    // Si la pestaña activa quedó escondida, ocupa el último hueco visible para
    // que el usuario vea siempre dónde está.
    const swapped = [...primary.slice(0, slots - 1), activeInRest];
    return { visible: swapped, overflow: tabs.filter(tab => !swapped.includes(tab)) };
  }, [tabs, activeTab]);

  // Con la hoja abierta bloqueamos el scroll de fondo y habilitamos Escape.
  useEffect(() => {
    if (!sheetOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [sheetOpen]);

  const overflowActive = overflow.some(tab => tab.id === activeTab);

  const select = (id: string) => {
    onTab(id);
    setSheetOpen(false);
    // Cambiar de pestaña sin volver arriba deja al usuario a media página.
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {sheetOpen && (
        <div className="fixed inset-0 z-[70] md:hidden" role="dialog" aria-modal="true" aria-label="Más secciones">
          <button
            className="absolute inset-0 h-full w-full bg-black/70 backdrop-blur-sm"
            onClick={() => setSheetOpen(false)}
            aria-label="Cerrar"
          />
          <div className="tabbar-sheet absolute inset-x-0 bottom-0 border-t border-white/15 bg-[#111114] pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/45">Más secciones</span>
              <button
                onClick={() => setSheetOpen(false)}
                aria-label="Cerrar"
                className="-mr-2 grid h-10 w-10 place-items-center text-white/40 active:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[55dvh] overflow-y-auto p-2">
              {overflow.map(tab => {
                const Icon = iconFor(tab);
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => select(tab.id)}
                    className={`flex min-h-14 w-full items-center gap-4 px-4 text-left transition-colors ${
                      active ? "bg-[#e10600] text-white" : "text-white/70 active:bg-white/10"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="text-sm font-black uppercase tracking-tight">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav
        className="tabbar fixed inset-x-0 bottom-0 z-[65] border-t border-white/10 bg-[#09090b]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
        aria-label="Navegación principal"
      >
        <div className="flex items-stretch">
          {visible.map(tab => {
            const Icon = iconFor(tab);
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => select(tab.id)}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[3.75rem] flex-1 basis-0 flex-col items-center justify-center gap-1 px-1 transition-colors ${
                  active ? "text-white" : "text-white/40 active:text-white/80"
                }`}
              >
                {active && <span className="absolute inset-x-2 top-0 h-0.5 bg-[#e10600]" />}
                <Icon className={`h-5 w-5 ${active ? "text-[#e10600]" : ""}`} />
                <span className="w-full truncate text-center text-[10px] font-black uppercase leading-none tracking-[0.02em]">
                  {SHORT_LABELS[tab.id] || tab.label}
                </span>
              </button>
            );
          })}

          {overflow.length > 0 && (
            <button
              onClick={() => setSheetOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
              className={`relative flex min-h-[3.75rem] flex-1 basis-0 flex-col items-center justify-center gap-1 px-1 transition-colors ${
                overflowActive ? "text-white" : "text-white/40 active:text-white/80"
              }`}
            >
              {overflowActive && <span className="absolute inset-x-2 top-0 h-0.5 bg-[#e10600]" />}
              <Ellipsis className={`h-5 w-5 ${overflowActive ? "text-[#e10600]" : ""}`} />
              <span className="text-[10px] font-black uppercase leading-none tracking-[0.02em]">Más</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
