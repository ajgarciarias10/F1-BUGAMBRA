import { Link, useLocation } from "react-router";
import { enlaceActivo, type EnlaceMenu } from "./secciones";

interface Props {
  enlaces: EnlaceMenu[];
  menuAbierto: boolean;
  onMas: () => void;
}

/** Barra inferior del móvil: cuatro accesos y «Más», que abre el menú. Oculta desde 900 px. */
export function BarraInferior({ enlaces, menuAbierto, onMas }: Props) {
  const { pathname, search } = useLocation();
  return (
    <nav className="ns-barra" aria-label="Accesos rápidos">
      {enlaces.map(e => {
        const activo = enlaceActivo(e.href, pathname, search);
        return (
          <Link
            key={e.href}
            to={e.href}
            className={`ns-barra-item${activo ? " is-active" : ""}`}
            aria-current={activo ? "page" : undefined}
          >
            {e.etiqueta}
          </Link>
        );
      })}
      <button
        type="button"
        className="ns-barra-item"
        aria-label="Más secciones"
        aria-expanded={menuAbierto}
        aria-controls="ns-menu"
        onClick={onMas}
      >
        Más
      </button>
    </nav>
  );
}
