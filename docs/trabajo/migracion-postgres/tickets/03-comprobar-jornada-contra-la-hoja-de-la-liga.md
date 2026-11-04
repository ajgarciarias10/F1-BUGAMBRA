# 03. Comprobar cada jornada contra la hoja de la liga, leyéndola directamente

- **Branch from:** feature/migracion-postgres
- **Work branch:** feature/comprobar-jornada-hoja
- **Owned files:** `docs/trabajo/migracion-postgres/**`, `scripts/check-race-against-sheet.mjs`, `scripts/lib/league-sheet.mjs`, `scripts/check-race-against-sheet.test.mjs`
- **Do not touch:** `apps/web/**`, `apps/api/src/**`, Firestore y Postgres (solo lectura), `AGENTS.md` (se cambia aparte, con el visto bueno del dueño)
- **Agent and model:** Claude, nivel medio
- **Done when:** `node scripts/check-race-against-sheet.mjs --split <id> --race <id>` descarga la hoja, la guarda con su SHA-256, comprueba que el formato no cambió y imprime un informe de diferencias entre la hoja y los datos de la app, sin escribir nada. Con test que falla si cambia el diseño de la hoja.

## Context

Hoy el dueño pasa el Excel en crudo cada vez que aplica una jornada. La hoja se puede exportar sin credenciales (`https://docs.google.com/spreadsheets/d/<ID>/export?format=xlsx`, visto el 2026-11-04), así que la comprobación puede leerla sola.

La hoja que dio el dueño el 2026-11-04 (ID guardado en `~/.secrets/league-sheet-id`, no en el repo) tiene el mismo diseño que el libro del que habla `AGENTS.md` (`2026!E50` «Presupuesto», `R50` «Fichajes T3»), pero es posterior: 59 columnas y ya contiene fichajes T4. El dueño confirmó que esta hoja configurada es la oficial. Su enlace en `AGENTS.md` se actualizará en otro trabajo, porque ese archivo no está en `Owned files:`. La web aún no refleja la hoja porque faltan sanciones del circuito; la migración conserva los datos de Firebase.

## What to do

1. **Descarga.** Leer el ID de `LEAGUE_SHEET_ID` (o del fichero indicado). Guardar cada lectura en `~/backups/hoja-liga/` con la fecha y los primeros 12 caracteres del SHA-256, y escribir el SHA completo en el informe. Es la "versión del libro" que exigen las reglas de economía.
2. **Guarda de formato.** Si falta la hoja `2026` o cambian las cabeceras que se usan, parar con un error claro (misma idea que `scripts/audit-workbook-economy.mjs`). Sin esa guarda no se interpreta nada.
3. **Lectura por nombres, no por posiciones fijas.** Localizar equipos, pilotos y circuitos por sus rótulos (y registrar la celda de donde sale cada cifra) para sobrevivir a columnas nuevas, que ya han aparecido (T4).
4. **Alias de nombres.** Tabla explícita y revisable (por ejemplo, Alex = Mimic), en un fichero de datos, no en el código.
5. **Comprobación de la jornada:** posiciones y puntos por piloto, premios de la carrera (pole, vuelta rápida, sin sanciones, participación, rivalidades), fichajes y presupuesto de cada equipo. Para cada cifra: valor de la hoja con su celda, valor de la app, y si coincide.
6. **Solo informa.** No corrige nada ni infiere posiciones desde puntos. Una celda vacía es "desconocido", no cero (`AGENTS.md`, resultados).
7. **Fuente de datos de la app:** de la misma interfaz que use el ticket 02 (Postgres, o Firestore en solo lectura mientras la app siga viva).

## Rules that apply

`AGENTS.md`: «Treat the current official league workbook as the source…», registrar hoja, celdas y versión; alias explícito; nunca constantes de equipos ni pilotos en el código; ninguna cifra se declara aplicada en la base real por un informe.

## Report

Plantilla de `docs/agents/operating-procedure.md` §3.4. Incluir un informe de ejemplo con la hoja del 2026-11-04 y lo que no se pudo comprobar.
