import type { UserRole } from "../auth.ts";

declare global {
  namespace Express {
    interface Request {
      currentUser?: {
        firebaseUid: string;
        email: string;
        displayName: string;
        role: UserRole;
      };
    }
  }
}

export {};
