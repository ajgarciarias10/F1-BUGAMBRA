# 07. Cierre de la fase 2: libro real, avisos, subasta, comenzar split y presupuesto inicial

- **Branch from:** `main` (0f5d8a9)
- **Work branch:** `feature/prototipo-conectado`
- **Owned files:** `docs/trabajo/conexion-real/tickets/07-cierre-fase-2.md`, `tool/conectar-prototipo.mjs`, `tool/prototipo-acciones.js`, `apps/web/src/prototipo/**`, `apps/web/src/services/adminMutationService.ts`, `apps/web/src/components/EconomyAdminPanel.tsx`, `docs/BACKLOG.md`
- **Do not touch:** `apps/api/**`, `firestore.rules`, las reglas de dinero.
- **Agent and model:** Agente de esta sesión, sin delegación.
- **Done when:** Mi escudería enseña el libro real (`transacciones`) y «Conciliado» solo cuando cuadra con el saldo; el inicio enseña el último aviso oficial real y el admin puede publicar uno; el admin activa o pausa la subasta en vivo, comienza el split y fija el presupuesto inicial con los servicios del panel; el mercado lleva a la sala de pujas real; «Subir cláusula» del jeque desaparece (no es una regla de la liga); typecheck, tests web y build pasan.

## Context

El 24-10-2026 el dueño pidió acabar la fase. Quedaban datos de ejemplo (libro, avisos, estado de conciliación) y acciones que solo abrían el panel completo.

## Remaining on purpose

La sala de pujas en vivo (reloj, pujas, adjudicación) sigue en el panel completo, enlazada desde Mercado. Boletín FIA en PDF, descalificación (DSQ) y reabrir un acta también.
