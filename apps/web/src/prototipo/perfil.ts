/** Del perfil de Firestore a la sesión que entiende el prototipo. Puro, con pruebas. */

export interface SesionPrototipo {
  uid: string;
  nombre: string;
  /** Rol de Firestore: admin, jeque, director_deportivo, piloto, usuario o invitado. */
  rol: string;
  /** Escudería con el id del prototipo (zenith, alfa, roses) o null. */
  equipoId: string | null;
  /** Piloto enlazado con el id del prototipo (fabi, mimic…) o null. */
  pilotoSlug: string | null;
  foto: string | null;
}

const EQUIPO: Record<string, string> = { equipo_zenith: "zenith", equipo_alfa_romero: "alfa", equipo_roses: "roses" };
const CORREO_ADMIN = "ajgarciarias@gmail.com";

export function sesionDesdePerfil(uid: string, email: string, perfil: Record<string, any>): SesionPrototipo {
  const correo = email.toLowerCase();
  const piloto = String(perfil.piloto_id || "").replace(/^piloto_/, "");
  return {
    uid,
    nombre: String(perfil.nombre || "").trim() || correo.split("@")[0] || "Miembro",
    // Igual que AuthContext: el dueño siempre entra como admin aunque su perfil antiguo diga otra cosa.
    rol: correo === CORREO_ADMIN ? "admin" : String(perfil.rol || "usuario"),
    equipoId: EQUIPO[perfil.escuderia_id] ?? null,
    pilotoSlug: piloto || null,
    foto: perfil.foto_url || null,
  };
}
