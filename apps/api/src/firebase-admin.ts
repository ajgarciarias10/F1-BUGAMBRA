import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { config } from "./config.ts";

const app = getApps()[0] ?? initializeApp({
  projectId: config.firebaseProjectId,
  ...(process.env.GOOGLE_APPLICATION_CREDENTIALS ? { credential: applicationDefault() } : {}),
});

export const firebaseAuth = getAuth(app);
