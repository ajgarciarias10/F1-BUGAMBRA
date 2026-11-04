# Traspaso: migración de Firebase a PostgreSQL (estado a 2026-11-04)

Lee `AGENTS.md` y `docs/agents/operating-procedure.md` primero. Una rama por trabajo, un ticket manda, sin firmas de agente en commits (nada de `Co-Authored-By`), no se hace push ni merge sin el dueño.

## Por qué

El dueño se quedó sin suscripción de Google Cloud. Todo sale de Firebase (proyecto `gen-lang-client-0829043813`, Firestore base `development`) a PostgreSQL en este servidor. La web ya no debe depender de Firebase.

## Decisiones del dueño

- Inicio de sesión **solo con Google**, integrado en la app (sin Firebase Auth). **No se migran contraseñas.** Cada usuario necesita un correo con cuenta de Google.
- `admin@f1bugambra.com` **no existe** en la base nueva. El administrador es `ajgarciarias@gmail.com`.
- Los fallos de orden y de datos se arreglan **antes de producción**.
- Migrar ordenado y sin sobrecargar la base: imágenes base64 fuera de las filas.
- Los cuatro `paddock_posts` no entran en la base nueva por decisión del dueño; siguen en la copia fiel y la exportación.
- Cada carrera se revisa contra la hoja de la liga antes de aplicar su economía (ticket 04).

## Qué existe ya

| Qué | Dónde |
|---|---|
| Exportación de Firebase (396 documentos, 17 usuarios Auth; sin Storage, el bucket no existe) | `~/backups/f1-firebase-2026-11-04/` (+ `.tar.gz`, `.sha256`) |
| Segunda copia, en el mismo servidor | `/var/tmp/f1-copia2/` |
| Foto de la hoja de la liga (SHA `8f6009254a03…`) | `~/backups/hoja-liga/libro-2026-11-04-8f6009254a03.xlsx` |
| Postgres de F1 (contenedor `f1-postgres`, `127.0.0.1:5433`, base `f1_bugambra`) | URL en `~/.secrets/f1-pg-url` |
| Copia fiel importada | esquema `f1_import_test` (tablas `documento`, `auth_usuario`) |
| Importador y verificador | `apps/api/scripts/import-firestore-staging.ts` (`npm run db:import-staging -- <carpeta> [--verify]` desde `apps/api`, con `DATABASE_URL`) |
| Clave de servicio de Firebase | `~/.secrets/f1-firebase-sa.json` |
| ID de la hoja de la liga | `~/.secrets/league-sheet-id` |
| Esquema normalizado destino | `apps/api/database/migrations/001_initial_schema.sql` (18 tablas) |
| Importación normalizada local del ticket 02, aún sin integrar | `apps/api/scripts/migrate-staging-to-schema.ts` y [reporte completo](informe-conciliacion-2026-11-04.json) |

Notas prácticas:
- El `psql` del servidor es un envoltorio que no llega al puerto 5433. Usar `docker exec f1-postgres psql -U f1_bugambra -d f1_bugambra`.
- Ramas: `feature/migracion-postgres` es la base; el ticket 03 está en `feature/comprobar-jornada-hoja` y el 02 en `feature/migracion-postgres-normalizar`. No hay push ni integración.
- Había `?? .claude/` y `?? docs/redesign/reviews/` sin seguimiento en el árbol: no son de esta tarea, no tocar.

## Orden de trabajo

1. **Ticket 03** (lector de la hoja y informe de jornada). Es lo que permite decidir qué saldo es el bueno.
2. **Ticket 02** (llevar los datos al esquema normalizado). El administrador es `ajgarciarias@gmail.com`. El dueño decidió descartar `paddock_posts` del destino; la copia de Firebase permanece intacta.
3. **Ticket 04** (puerta de revisión antes de aplicar la economía). Depende del 03.
4. Reescribir web y API sin Firebase: sesión propia y botón de Google (Google Identity Services, verificación del token en la API). Falta su ticket; **parar y preguntar antes de añadir cualquier dependencia nueva** (por ejemplo `google-auth-library` o `jose`).

## Hallazgos abiertos

- 27 de 200 transacciones (`…__historico__…`) no tienen fecha; 26 la guardan como texto ISO y 147 como timestamp. `ledger_entry.secuencia` da un orden explícito, con fecha normalizada cuando existe y `seq` de la copia para los históricos sin fecha.
- La comparación preliminar de saldo actual frente a inicial + movimientos del mismo split difiere en 8 de 14 casos (equipo y split, incluidos los equipos de agentes libres). Roses Split 1 está explicado: cierre histórico 145 M menos 116,9 M de fichajes del Split 2 = saldo actual 28,1 M. Las ocho diferencias brutas y sus movimientos están en el reporte; las restantes se investigan antes de proponer cualquier corrección (`AGENTS.md`).
- `apps/api/src/auth.ts` acepta tokens de respaldo comprobando solo `aud`, `iss` y `exp`, **sin verificar la firma**. Hay que quitarlo en la migración de auth.
- La hoja configurada es la oficial según el dueño y tiene 59 columnas, ya con fichajes T4. El enlace de `AGENTS.md` aún apunta al libro anterior; su cambio requiere un trabajo con ese archivo en alcance.

## Pendiente del dueño (no del agente)

- Descargar una copia de `~/backups/f1-firebase-2026-11-04.tar.gz` fuera del servidor.
- Revocar la clave de servicio de Firebase al terminar de leer.
- No borrar el proyecto Firebase hasta que la app nueva funcione en producción.
