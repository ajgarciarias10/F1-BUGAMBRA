# 04. Puerta de revisión contra la hoja antes de aplicar la economía de una carrera

- **Branch from:** feature/migracion-postgres-con-hoja (tickets 02 y 03 integrados)
- **Work branch:** feature/puerta-revision-economia
- **Owned files:** `docs/trabajo/migracion-postgres/tickets/04-puerta-de-revision-antes-de-aplicar-la-economia.md`; `apps/api/database/migrations/004_google_account.sql` (nuevo), `apps/api/src/auth.ts`, `apps/api/src/google-identity.ts` (nuevo), `apps/api/src/config.ts`, `apps/api/src/types/express.d.ts`, `apps/api/src/server.ts`, `apps/api/tests/google-auth.test.ts` (nuevo), `apps/api/.env.example`. Para la interfaz de Google: `apps/web/src/prototipo/sesion.ts`, `apps/web/src/contexts/AuthContext.tsx`, `apps/web/src/services/auth.ts`, `apps/web/src/nueva/pantallas/Acceso.tsx`, `apps/web/src/components/LoginRegister.tsx` y sus pruebas directas. Los ficheros de resultados y economía se concretarán al resolver su alcance pendiente; no tocarlos antes.
- **Do not touch:** cálculos de `presupuesto.ts` y `economyRules.ts` (solo se leen), `firestore.rules`, datos en vivo
- **Agent and model:** Claude, nivel medio; revisión final del dueño
- **Done when:** aplicar la economía de una carrera es imposible desde la interfaz si la revisión no pasó o si algo cambió después de ella; `npm run guardrails:economy` en verde; pruebas que fallan antes y pasan después.

## Context

Decisión del dueño (2026-11-04): tras calcular la economía de una carrera, se revisa contra la hoja de la liga; si hay diferencias se **para** y se habla; cuando está corregido se acepta. Usa el lector del ticket 03.

Decisión posterior del dueño: la liquidación debe pasar a la API/PostgreSQL y el acceso de Google debe usar Google Identity Services con `google-auth-library` (ya instalada), sin clave de servicio ni escritura en Firebase. La puerta no se activa mientras actas y resultados puedan divergir entre Firestore y PostgreSQL. El alcance exacto de esas escrituras y lecturas está pendiente de confirmación.

## Flujo

1. **Calcular sin escribir** (vista previa) con huella (hash) del resultado. Preview y aplicación usan el mismo cálculo (`AGENTS.md`).
2. **Revisar**: la API (no el navegador, por CORS) lee la hoja, guarda su SHA-256 y compara premios, rivalidades, fichajes y saldo final por equipo. Tolerancia 0,1M. Una celda vacía es «desconocido», no cero.
3. **Puerta**: sin diferencias se habilita «Aplicar»; con diferencias queda bloqueado y se muestra el informe (celda, valor hoja, valor app, diferencia).
4. Las diferencias se hablan con el dueño en el chat; se corrige y se vuelve a revisar.
5. **Aplicar** guarda en la auditoría el SHA de la hoja y la huella de la vista previa. Si cambia algo entre la revisión y la aplicación, se exige otra revisión.
6. **Aceptar con diferencias** (la hoja puede estar mal): solo con confirmación expresa del dueño, motivo escrito y registro antes/después.

## Requisitos de seguridad

- La puerta se comprueba en el servidor/transacción, no solo ocultando un botón.
- Una sola transacción, identificador estable por operación y guarda contra doble envío (`AGENTS.md`, fiabilidad de transacciones). Leer los valores dentro de la transacción.
- Cobertura: reembolsos, cargos extra, fondos insuficientes, precios negativos, precios sin cambio.
- No declarar nada aplicado en Firestore o Postgres reales sin que la transacción haya tenido éxito en el entorno de administración autenticado.
- Sin cifras de equipos ni pilotos en el código.

## Report

Plantilla de `docs/agents/operating-procedure.md` §3.4.
