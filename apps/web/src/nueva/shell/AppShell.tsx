import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import { BarraInferior } from "./BarraInferior";
import { Cabecera } from "./Cabecera";
import { MenuLateral } from "./MenuLateral";
import { barraInferior, inicioDe, menuPorRol, rutaDe, type Cuenta, type RolApp } from "./secciones";
import { useDirecto } from "./useDirecto";
import "./shell.css";

/** Datos de cuenta que el shell necesita, sacados de `useAuth()`. */
export function useCuentaShell(): Cuenta & { nombre: string; foto?: string } {
  const { user, userData } = useAuth();
  const conSesion = Boolean(user && userData);
  return {
    conSesion,
    rol: (conSesion ? userData?.rol ?? null : null) as RolApp,
    tienePiloto: Boolean(userData?.piloto_id),
    nombre: userData?.nombre || user?.displayName || "Mi cuenta",
    foto: userData?.foto_url || undefined,
  };
}

/** Marco de la app nueva: cabecera, menú lateral por rol, barra inferior móvil y contenido. */
export default function AppShell() {
  const cuenta = useCuentaShell();
  const { pathname, search } = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const botonMenuRef = useRef<HTMLButtonElement>(null);
  const enDirecto = useDirecto();

  const menu = useMemo(() => menuPorRol(cuenta), [cuenta.conSesion, cuenta.rol, cuenta.tienePiloto]); // eslint-disable-line react-hooks/exhaustive-deps
  const barra = useMemo(() => barraInferior(cuenta), [cuenta.conSesion, cuenta.rol]); // eslint-disable-line react-hooks/exhaustive-deps
  const cerrarMenu = useCallback(() => setMenuAbierto(false), []);

  // Cambiar de sección cierra el menú.
  useEffect(() => { setMenuAbierto(false); }, [pathname, search]);

  const visita = cuenta.rol === null || cuenta.rol === "invitado";

  return (
    <div className={`ns-app${barra ? " ns-con-barra" : ""}`}>
      <a href="#ns-contenido" className="ns-saltar">Saltar al contenido</a>
      <Cabecera
        menuAbierto={menuAbierto}
        onAbrirMenu={() => setMenuAbierto(true)}
        botonMenuRef={botonMenuRef}
        inicio={inicioDe(cuenta)}
        enDirecto={enDirecto}
        rutaTv={visita ? rutaDe("portada", "?tab=tv") : rutaDe("tv")}
        cuenta={cuenta.conSesion ? { nombre: cuenta.nombre, foto: cuenta.foto } : null}
      />
      <MenuLateral abierto={menuAbierto} onCerrar={cerrarMenu} menu={menu} botonMenuRef={botonMenuRef} />
      <main id="ns-contenido" className="ns-main" tabIndex={-1}>
        <Outlet />
      </main>
      {barra && <BarraInferior enlaces={barra} menuAbierto={menuAbierto} onMas={() => setMenuAbierto(true)} />}
    </div>
  );
}
