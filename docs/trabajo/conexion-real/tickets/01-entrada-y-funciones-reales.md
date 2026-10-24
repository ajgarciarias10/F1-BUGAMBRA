# 01. Servir la aplicación real y conectar la navegación del rediseño

- **Branch from:** `main` (38b8516)
- **Work branch:** `fix/conexion-app-real`
- **Owned files:** `docs/trabajo/conexion-real/tickets/01-entrada-y-funciones-reales.md`, `apps/web/package.json`, `apps/web/src/App.tsx`, `apps/web/src/nueva/shell/secciones.ts`, `apps/web/src/nueva/shell/secciones.test.ts`, `apps/web/src/nueva/shell/SeccionNueva.tsx`, `apps/web/src/nueva/pantallas/Portada.tsx`, `apps/web/src/nueva/pantallas/Portada.test.ts`, `apps/web/src/nueva/pantallas/Campeonato.tsx`, `apps/web/src/nueva/pantallas/Campeonato.test.ts`, `tool/web-entry.test.mjs`, `docs/BACKLOG.md`
- **Do not touch:** `apps/api/**`, `firestore.rules`, `apps/web/src/services/**`, `apps/web/src/utils/**`, `apps/web/src/contexts/**`, `apps/web/src/hooks/**`, `docs/redesign/prototipo-gemini/**`
- **Agent and model:** Agente de esta sesión, sin delegación ni cambio de modelo.
- **Done when:** el build conserva la entrada React, sin controles de prototipo; la entrada pública y el acceso llevan a las pantallas reales; las secciones pendientes abren los paneles existentes, conservando permisos y servicios; el comparador distingue split y temporada; Resultados muestra el vídeo guardado cuando existe; typecheck, tests web y build pasan.

## Context

El dueño pidió conectar Google y las funciones de base de datos, comparar por split o temporada y mostrar el vídeo de vuelta rápida. Añadió retirar la franja superior de prototipo. El 24-10-2026 autorizó preparar este ticket y trabajar en una copia limpia, conservando los archivos sin seguimiento del checkout original.

Hallazgo: `apps/web/package.json` ejecuta Vite y después sustituye `dist/index.html` por el HTML del prototipo, que contiene autenticación y escrituras simuladas. React ya tiene Firebase Auth, lecturas Firestore, servicios de escritura y varias pantallas del rediseño (ADR 0004).

## What to do

- Retirar esa sustitución del build. El prototipo queda como referencia de diseño, fuera de la entrada publicada.
- Abrir las pantallas React implementadas; conservar acceso a los paneles funcionales aún no sustituidos y sus permisos. Migrar enlaces hash conocidos del prototipo a rutas reales.
- Conectar las pestañas públicas con vistas de datos existentes. Mantener las acciones en los servicios actuales y los guardas contra doble envío.
- Hacer explícito el ámbito del comparador y probar que los totales de una temporada no se confunden con los de un split.
- Verificar el reproductor existente con URL guardada y sin URL; no inventar un vídeo ni escribir datos para probarlo.
- Añadir una regresión sobre el artefacto generado: debe arrancar React y no contener simuladores de autenticación, roles o datos. Ejecutarla contra el build anterior primero.
- Actualizar el backlog con el estado y las verificaciones pendientes. No desplegar ni integrar en main.

## Rules that apply

`AGENTS.md` y `docs/agents/operating-procedure.md`. Sin dependencias nuevas, cambios de reglas económicas, autenticación, permisos ni transacciones. No escrituras de prueba en Firestore. Las comprobaciones locales no certifican un login real con Google ni una publicación en producción.

## Report

Usar el informe del procedimiento. Separar las pruebas locales de la verificación autenticada y del despliegue que hace el dueño. El ticket se prepara en esta rama con autorización del dueño; el guard de CI contra main requiere que el dueño integre primero el ticket.
