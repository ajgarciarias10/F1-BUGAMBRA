# 01. Importar la exportación de Firebase a un esquema de pruebas de PostgreSQL

- **Branch from:** main
- **Work branch:** feature/migracion-postgres
- **Owned files:** `docs/trabajo/migracion-postgres/**`, `apps/api/scripts/import-firestore-staging.ts`, `apps/api/package.json` (solo el script `db:import-staging`)
- **Do not touch:** `apps/web/**`, `firestore.rules`, `apps/api/database/migrations/**`, el proyecto Firebase en vivo (solo se lee con la exportación ya hecha)
- **Agent and model:** Claude, nivel medio
- **Done when:** `npm run db:import-staging -- --verify` sale con código 0: mismos documentos y mismo hash por documento que la exportación, sin huérfanos, 17 usuarios de Auth.

## Context

La cuenta de Google Cloud del proyecto `gen-lang-client-0829043813` ya no se paga y la app debe vivir en este servidor. Primero se hace una copia fiel y verificable de Firestore y Auth en el esquema `f1_import_test` (no toca el esquema real). El paso al esquema normalizado (`001_initial_schema.sql`) es un ticket aparte y exige cuadrar saldos con el libro (`AGENTS.md`, reglas de economía).

La exportación vive fuera del repo (`~/backups/f1-firebase-2026-11-04/`, contiene datos personales).

## What to do

1. Tabla `documento`: una fila por documento de Firestore, con `seq` determinista (orden ordinal por ruta, el padre siempre antes que sus hijos), ruta única, `parent_path` con clave foránea, colección, nivel, `data` jsonb y hash.
2. Tabla `auth_usuario` con los usuarios de Auth.
3. Modo `--verify`: relee la base y compara con los ficheros de la exportación.

## Rules that apply

`AGENTS.md`: solo se escribe en un esquema `f1_import_*`; nada de datos de equipos ni de pilotos en el código; no se declara aplicado nada en Firestore en vivo.
