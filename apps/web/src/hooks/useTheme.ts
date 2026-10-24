import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

export const THEME_KEY = "bugambra-theme";
// Clave del selector anterior: se respeta una vez para no resetear a nadie.
const LEGACY_KEY = "f1-theme";
const META_COLORS: Record<Theme, string> = { light: "#f4f2ee", dark: "#0b0c10" };

const listeners = new Set<() => void>();

function readStored(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") return stored;
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy === "dark" || legacy === "light") return legacy;
  } catch { /* almacenamiento bloqueado */ }
  return "light";
}

function currentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", META_COLORS[theme]);
}

function setTheme(theme: Theme) {
  applyTheme(theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* modo privado */ }
  listeners.forEach(fn => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_KEY) return;
    applyTheme(event.newValue === "dark" ? "dark" : "light");
    fn();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

// Aplica el tema guardado en cuanto se importa el módulo (el script inline de
// index.html ya lo hizo antes del primer pintado; esto cubre tests y otros hosts).
if (typeof document !== "undefined") applyTheme(readStored());

/** Tema claro/oscuro persistido. `dark` se refleja en <html class="dark" data-theme>. */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "light" as Theme);
  const toggle = useCallback(() => setTheme(currentTheme() === "dark" ? "light" : "dark"), []);
  return { theme, dark: theme === "dark", toggle, setTheme };
}
