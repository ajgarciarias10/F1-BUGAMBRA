import type { RefObject } from "react";
import { Link } from "react-router";
import { useTheme } from "../../hooks/useTheme";
import { rutaDe } from "./secciones";

interface Props {
  menuAbierto: boolean;
  onAbrirMenu: () => void;
  botonMenuRef: RefObject<HTMLButtonElement | null>;
  inicio: string;
  enDirecto: boolean;
  /** Ruta de TV según haya sesión (pantalla TV) o no (pestaña TV de la portada). */
  rutaTv: string;
  cuenta: { nombre: string; foto?: string } | null;
}

/** Cabecera del prototipo: hamburguesa, marca, directo (solo si hay), tema y cuenta. */
export function Cabecera({ menuAbierto, onAbrirMenu, botonMenuRef, inicio, enDirecto, rutaTv, cuenta }: Props) {
  const { dark, toggle } = useTheme();

  return (
    <header className="ns-cabecera">
      <div className="ns-cabecera-in">
        <div className="ns-grupo">
          <button
            ref={botonMenuRef}
            type="button"
            className="ns-icono"
            aria-label="Abrir menú"
            aria-expanded={menuAbierto}
            aria-controls="ns-menu"
            onClick={onAbrirMenu}
          >
            <span className="ns-burger" aria-hidden="true"><span /><span /><span /></span>
          </button>
          <Link to={inicio} className="ns-marca" aria-label="Inicio F1 Bugambra">
            <span className="ns-marca-f1">F1</span>
            <span>Bugambra</span>
          </Link>
        </div>

        <div className="ns-grupo">
          {enDirecto && (
            <Link to={rutaTv} className="ns-directo" aria-label="En directo: abrir TV">
              <span className="ns-directo-punto" aria-hidden="true" />
              <span>En vivo</span>
            </Link>
          )}
          <button
            type="button"
            className="ns-icono"
            aria-label={dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
            onClick={toggle}
          >
            <span className="ns-tema" aria-hidden="true" />
          </button>
          {cuenta ? (
            <Link to={rutaDe("perfil")} className="ns-cuenta" aria-label={`Mi cuenta: ${cuenta.nombre}`}>
              <span className="ns-avatar" aria-hidden="true">
                {cuenta.foto ? <img src={cuenta.foto} alt="" /> : cuenta.nombre.slice(0, 1).toUpperCase()}
              </span>
              <span className="ns-cuenta-nombre">{cuenta.nombre}</span>
            </Link>
          ) : (
            <Link to={rutaDe("entrar")} className="ns-entrar">Entrar</Link>
          )}
        </div>
      </div>
    </header>
  );
}
