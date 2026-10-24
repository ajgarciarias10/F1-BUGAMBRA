# Orquestación: TypeSafe elige el agente y Orca reparte

Referencia, no procedimiento: las invariantes están en [`AGENTS.md`](../../AGENTS.md) y los pasos en [`operating-procedure.md`](operating-procedure.md). Es la misma orquestación que usa CleverTracker (`~/projects/CleverTracker/docs/agents/orquestacion.md` y su ADR 0008), adoptada aquí por decisión del dueño el 23-10-2026.

## Quién hace cada ticket lo decide TypeSafe

El coordinador no elige el agente. Justo antes de lanzar una ola, pregunta a TypeSafe por cada ticket:

```bash
tool/pedir-agente.sh docs/trabajo/<slug>/tickets/NN-<nombre>.md top    # o bounded
# agent: codex (level top)
```

- La respuesta tiene en cuenta la cuota de cada agente en ese momento (Claude, Codex, OpenCode y Antigravity, que es el relevo cuando los demás se quedan sin tokens). Ver la cuota: `python3 ~/projects/CleverTracker/tool/pedir_agente.py --disponibilidad`.
- `nobody` (código 3): el ticket se queda fuera de la ola y se avisa al dueño. El coordinador no lo asigna por su cuenta.
- Nivel: `top` para economía, transacciones, escrituras en Firestore y pantallas de admin; `bounded` para cambios acotados de pocas pantallas.
- `tool/pedir-agente.sh` solo traduce las etiquetas de nuestra plantilla (`**Owned files:**`, `**Done when:**`) a las que lee TypeSafe; no decide nada.

## Cómo se lanza una ola

Todos los tickets independientes salen a la vez, cada uno en su worktree, con el agente que dijo TypeSafe:

```text
orca-ide orchestration run-create --objective "<qué se persigue>" --json
orca-ide orchestration worker-start --spec "<ruta del ticket>" --worktree new-top-level --agent <respuesta de TypeSafe> --json
orca-ide orchestration check --wait --types "worker_done,escalation,question" --timeout-ms 900000 --json
```

Se despacha el ticket, no una spec nueva: el ticket ya trae objetivo, cambio, restricciones, ficheros en propiedad y criterio de terminado. Un ticket, una Task.

## Cómo liquida un trabajador

`orca-ide orchestration worker_done --outcome succeeded|failed --files-modified "<los que tocó>" --json`. El resultado va en `--outcome`, no solo en la prosa. Una decisión que no es suya se pregunta con `ask` y espera respuesta. Un `succeeded` no integra nada: el coordinador comprueba la rama (pruebas, `tool/agent-guard.mjs`, capturas) y la integra en la rama de preview que haya pedido el dueño.
