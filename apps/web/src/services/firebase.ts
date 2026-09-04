import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import firebaseConfig from "../../../../firebase-applet-config.json";

// Ojo: este módulo NO puede importar "firebase/auth". Lo importa todo el que
// necesita `db`, así que hacerlo metería el SDK de autenticación (270 kB, con
// re2js dentro) en el arranque de la portada, que solo lee datos públicos.
// La instancia de auth vive en ./auth y se carga cuando hace falta.
export const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
}, firebaseConfig.firestoreDatabaseId);

// Custom Error Handler wrapper as per guidelines
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

/** Datos de la sesión para los informes de error. Los rellena ./auth al
 *  inicializarse, para que este módulo no dependa del SDK de autenticación. */
let authInfoProvider: (() => FirestoreErrorInfo["authInfo"]) | null = null;

export function setAuthInfoProvider(provider: () => FirestoreErrorInfo["authInfo"]) {
  authInfoProvider = provider;
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: authInfoProvider ? authInfoProvider() : {},
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
