import type { ReactNode } from "react";
export interface TablaAdminProps { titulo: string; cabecera: ReactNode; children: ReactNode; variante?: "resumen" | "mercado" | "acta" }
/** Cabecera recibe filas de th con scope; children recibe las filas del tbody.
 * La pantalla conserva todos los controles, acciones y guardas de guardado. */
export function TablaAdmin({ titulo, cabecera, children, variante = "resumen" }: TablaAdminProps) {
  return <div className="nui-admin-scroll" role="region" aria-label={titulo} tabIndex={0}>
    <table className={`nui-admin-table nui-admin-table--${variante}`}><caption>{titulo}</caption><thead>{cabecera}</thead><tbody>{children}</tbody></table>
  </div>;
}
