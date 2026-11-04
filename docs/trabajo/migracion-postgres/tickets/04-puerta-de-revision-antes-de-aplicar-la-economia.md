# 04. Puerta de revisión contra la hoja antes de aplicar la economía de una carrera

- **Branch from:** la rama donde esté integrado el ticket 03 (no empezar sin él)
- **Work branch:** feature/puerta-revision-economia
- **Owned files:** los que el agente liste y el dueño apruebe antes de empezar (el flujo de aplicar la economía está repartido por `apps/web/src/services/raceProcessor.ts`, `economyService.ts`, `adminMutationService.ts` y `AdminDashboard.tsx`; **parar y preguntar** si hace falta otro)
- **Do not touch:** cálculos de `presupuesto.ts` y `economyRules.ts` (solo se leen), `firestore.rules`, datos en vivo
- **Agent and model:** Claude, nivel medio; revisión final del dueño
- **Done when:** aplicar la economía de una carrera es imposible desde la interfaz si la revisión no pasó o si algo cambió después de ella; `npm run guardrails:economy` en verde; pruebas que fallan antes y pasan después.

## Context

Decisión del dueño (2026-11-04): tras calcular la economía de una carrera, se revisa contra la hoja de la liga; si hay diferencias se **para** y se habla; cuando está corregido se acepta. Usa el lector del ticket 03.

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
