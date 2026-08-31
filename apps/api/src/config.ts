import "dotenv/config";

interface Config {
  port: number;
  databaseUrl: string;
  firebaseProjectId: string;
  corsOrigin: string;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta la variable de entorno ${name}.`);
  return value;
}

function readPort(): number {
  const port = Number(process.env.PORT ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT debe ser un puerto válido.");
  }
  return port;
}

export const config: Config = {
  port: readPort(),
  databaseUrl: required("DATABASE_URL"),
  firebaseProjectId: required("FIREBASE_PROJECT_ID"),
  corsOrigin: process.env.CORS_ORIGIN?.trim() || "http://localhost:3000",
};
