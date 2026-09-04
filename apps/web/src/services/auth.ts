import { getAuth } from "firebase/auth";
import { app, setAuthInfoProvider } from "./firebase";

/**
 * Instancia de Firebase Auth, en su propio módulo a propósito.
 *
 * El SDK de autenticación pesa unos 270 kB (arrastra re2js) y la portada
 * pública no lo necesita para pintar la clasificación. Al vivir aquí, solo
 * entra en el paquete de quien lo importa: el login, los dashboards y el
 * AuthContext, que lo carga de forma diferida.
 */
export const auth = getAuth(app);

// Los informes de error de Firestore quieren saber quién estaba conectado, pero
// services/firebase no puede importar auth sin volver a arrastrarlo al arranque.
setAuthInfoProvider(() => ({
  userId: auth.currentUser?.uid,
  email: auth.currentUser?.email,
  emailVerified: auth.currentUser?.emailVerified,
  isAnonymous: auth.currentUser?.isAnonymous,
}));
