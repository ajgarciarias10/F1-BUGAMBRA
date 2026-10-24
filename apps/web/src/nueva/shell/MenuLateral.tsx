import { useEffect, useRef, type KeyboardEvent, type RefObject } from "react";
import { Link, useLocation } from "react-router";
import { enlaceActivo, type EnlaceMenu, type Menu } from "./secciones";

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  menu: Menu;
  /** Botón que abrió el menú: recupera el foco al cerrar. */
  botonMenuRef: RefObject<HTMLButtonElement | null>;
}

const ENFOCABLES = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Menú lateral tipo Zara: entra desde la izquierda, enlaces grandes y finos y
 * un punto rojo en la sección activa. Es un diálogo modal: atrapa el foco,
 * Escape lo cierra y, cerrado, queda inerte para el teclado y el lector.
 */
export function MenuLateral({ abierto, onCerrar, menu, botonMenuRef }: Props) {
  const { pathname, search } = useLocation();
  const cajonRef = useRef<HTMLDivElement>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const estabaAbierto = useRef(false);

  useEffect(() => {
    if (abierto) {
      estabaAbierto.current = true;
      cerrarRef.current?.focus();
      const overflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const alPulsar = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
      window.addEventListener("keydown", alPulsar);
      return () => {
        document.body.style.overflow = overflow;
        window.removeEventListener("keydown", alPulsar);
      };
    }
    if (estabaAbierto.current) {
      estabaAbierto.current = false;
      botonMenuRef.current?.focus();
    }
  }, [abierto, onCerrar, botonMenuRef]);

  const atraparFoco = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !cajonRef.current) return;
    const nodos = Array.from(cajonRef.current.querySelectorAll<HTMLElement>(ENFOCABLES));
    if (nodos.length === 0) return;
    const primero = nodos[0];
    const ultimo = nodos[nodos.length - 1];
    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  };

  const lista = (enlaces: EnlaceMenu[]) => (
    <ul className="ns-cajon-lista">
      {enlaces.map(e => {
        const activo = enlaceActivo(e.href, pathname, search);
        return (
          <li key={e.href}>
            <Link
              to={e.href}
              className={`ns-enlace${activo ? " is-active" : ""}`}
              aria-current={activo ? "page" : undefined}
              onClick={onCerrar}
            >
              <span>{e.etiqueta}</span>
              <small>{e.sub}</small>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <div className={`ns-fondo${abierto ? " is-open" : ""}`} aria-hidden="true" onClick={onCerrar} />
      <div
        id="ns-menu"
        ref={cajonRef}
        className={`ns-cajon${abierto ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
        inert={!abierto}
        onKeyDown={atraparFoco}
      >
        <div>
          <div className="ns-cajon-cab">
            <span className="ns-marca" aria-hidden="true">
              <span className="ns-marca-f1">F1</span>
              <span>Bugambra</span>
            </span>
            <button ref={cerrarRef} type="button" className="ns-icono" aria-label="Cerrar menú" onClick={onCerrar}>
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <nav aria-label="Navegación principal">
            <div className="ns-cajon-etiqueta">{menu.etiqueta}</div>
            {lista(menu.principal)}
          </nav>
          {menu.admin.length > 0 && (
            <nav aria-label="Administración">
              <div className="ns-cajon-etiqueta">Administración</div>
              {lista(menu.admin)}
            </nav>
          )}
        </div>

        <div className="ns-cajon-pie">
          <div>Liga privada F1 25 entre amigos</div>
          <div>Importes en M€</div>
        </div>
      </div>
    </>
  );
}
