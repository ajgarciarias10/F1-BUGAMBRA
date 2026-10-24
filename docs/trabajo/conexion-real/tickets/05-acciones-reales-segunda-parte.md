# 05. Acciones del diseño con los servicios auditados (fase 2, segunda parte)

- **Branch from:** `main` (8c1df4c)
- **Work branch:** `feature/prototipo-conectado`
- **Owned files:** `docs/trabajo/conexion-real/tickets/05-acciones-reales-segunda-parte.md`, `tool/conectar-prototipo.mjs`, `tool/prototipo-acciones.js`, `apps/web/src/prototipo/**`, `apps/web/src/utils/actaResultados.ts`, `apps/web/src/utils/actaResultados.test.ts`, `apps/web/src/services/transferService.ts`, `apps/web/src/services/usuariosService.ts`, `apps/web/src/components/AdminDashboard.tsx`, `apps/web/src/components/EconomyAdminPanel.tsx`, `apps/web/src/components/AdminUsersPanel.tsx`, `docs/BACKLOG.md`
- **Do not touch:** `apps/api/**`, `firestore.rules`, las reglas de dinero (`utils/presupuesto.ts`, `utils/economyRules.ts`) y los servicios que solo se llaman.
- **Agent and model:** Agente de esta sesión, sin delegación.
- **Done when:** en el diseño, guardar resultados y cerrar el acta, registrar decisiones FIA, fichar fuera de subasta, ajustar saldo, liberar piloto, ajustar cláusula, cambiar rol y escudería de las cuentas reales y el logo del jeque escriben con los mismos servicios y validaciones que el panel clásico; el estado del acta y las decisiones FIA se leen de Firestore; typecheck, tests web y build pasan.

## Context

El 24-10-2026 el dueño pidió seguir con la segunda parte tras publicar la primera (ticket 04).

## Design

- La validación del acta sale de `AdminDashboard` a `utils/actaResultados.ts`; liberar y ajustar cláusula salen de `EconomyAdminPanel` a `transferService`; asignar usuario sale de `AdminUsersPanel` a `usuariosService`. El panel y el diseño usan el mismo código.
- La descalificación (DSQ) y reabrir un acta cerrada siguen en el panel completo; la multa FIA se anota sin cobrarse (ya en el backlog: falta su categoría en el libro).

## Pending

Sala de pujas en vivo, subir cláusula del jeque, votación del piloto del día (retirada), iniciar temporada, subasta en vivo y modo del mercado, presupuesto inicial, boletín FIA en PDF y el libro de movimientos de ejemplo. Abren el panel completo.
