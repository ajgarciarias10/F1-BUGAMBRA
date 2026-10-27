# 10. Registro de decisiones FIA: verlas, corregirlas y anularlas

- **Branch from:** `main` (ba4bcb6)
- **Work branch:** `feature/prototipo-conectado`
- **Owned files:** `docs/trabajo/conexion-real/tickets/10-registro-fia.md`, `tool/conectar-prototipo.mjs`, `tool/prototipo-acciones.js`, `apps/web/src/prototipo/**`, `apps/web/src/services/readModelService.ts`, `apps/web/src/types/index.ts`
- **Agent and model:** Agente de esta sesión, sin delegación.
- **Done when:** el acta de cada GP enseña el registro de sus decisiones FIA con fecha; cada una se edita o se anula sin borrarse (queda marcada y con antes/después en admin_audit); el botón de la fila de un piloto con decisión abre la suya para corregirla; la vista pública muestra las vigentes; typecheck, tests y build pasan.

## Context

El 27-10-2026 el dueño pidió que una decisión FIA ya escrita aparezca para modificarla, «como un registro».
