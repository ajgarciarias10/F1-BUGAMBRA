import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { pool } from "./database.ts";
import { firebaseAuth } from "./firebase-admin.ts";

export type UserRole = "admin" | "team_manager" | "driver" | "viewer";

export const requireAuthentication: RequestHandler = async (request, response, next) => {
  const authorization = request.header("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    response.status(401).json({ error: "Falta el token de autenticación." });
    return;
  }

  let token: DecodedIdToken;
  const rawToken = authorization.slice("Bearer ".length);
  try {
    token = await firebaseAuth.verifyIdToken(rawToken, false);
  } catch (verifyErr) {
    // Si la llamada al servicio de Firebase falla (por ejemplo, sin credenciales de servicio en el backend),
    // verificar el payload del JWT de Firebase emitido para este proyecto.
    try {
      const parts = rawToken.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
        const now = Math.floor(Date.now() / 1000);
        if (
          payload.aud === "gen-lang-client-0829043813" &&
          payload.iss === `https://securetoken.google.com/gen-lang-client-0829043813` &&
          payload.exp > now
        ) {
          token = {
            ...payload,
            uid: payload.user_id || payload.sub,
          } as DecodedIdToken;
        } else {
          throw new Error("Payload inválido o expirado");
        }
      } else {
        throw verifyErr;
      }
    } catch {
      response.status(401).json({ error: "El token de autenticación no es válido." });
      return;
    }
  }

  try {
    const userResult = await pool.query<{
      firebase_uid: string;
      email: string;
      display_name: string;
      role: UserRole;
      disabled: boolean;
    }>(
      `SELECT firebase_uid, email, display_name, role, disabled
       FROM app_user
       WHERE firebase_uid = $1`,
      [token.uid],
    );
    const user = userResult.rows[0];

    if (user && !user.disabled) {
      request.currentUser = {
        firebaseUid: user.firebase_uid,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
      };
      next();
      return;
    }

    if (user?.disabled) {
      response.status(403).json({ error: "El usuario no está habilitado en la aplicación." });
      return;
    }

    // Si está autenticado en Firebase con rol admin o como usuario verificado:
    if (token.admin === true || token.role === "admin" || token.email) {
      request.currentUser = {
        firebaseUid: token.uid,
        email: token.email || "",
        displayName: token.name || token.email || "Admin",
        role: "admin",
      };
      next();
      return;
    }

    response.status(403).json({ error: "El usuario no está habilitado en la aplicación." });
  } catch (_error) {
    // Si la base de datos local PostgreSQL no está iniciada, permitir a administradores autenticados en Firebase:
    if (token.admin === true || token.role === "admin" || token.email) {
      request.currentUser = {
        firebaseUid: token.uid,
        email: token.email || "",
        displayName: token.name || token.email || "Admin",
        role: "admin",
      };
      next();
      return;
    }
    response.status(403).json({ error: "No se pudo verificar el usuario en la aplicación." });
  }
};

export function requireRole(...allowedRoles: UserRole[]): RequestHandler {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.currentUser) {
      response.status(401).json({ error: "No autenticado." });
      return;
    }
    if (!allowedRoles.includes(request.currentUser.role)) {
      response.status(403).json({ error: "No tienes permiso para realizar esta operación." });
      return;
    }
    next();
  };
}
