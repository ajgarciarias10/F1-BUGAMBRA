#!/usr/bin/env bash
# Pregunta a TypeSafe (ADR 0008 de CleverTracker) qué agente hace un ticket de este repo.
# TypeSafe lee las etiquetas de la plantilla de CleverTracker («Ficheros en propiedad:»,
# «Terminado cuando:»); los tickets de F1 usan «**Owned files:**» y «**Done when:**».
# Este envoltorio traduce solo esas dos etiquetas en una copia temporal y no decide nada:
# si TypeSafe no responde o dice «nobody», sale con su mismo código.
#
# Uso: tool/pedir-agente.sh <ticket.md> <top|bounded> [base] [--json]
set -euo pipefail
ticket="$1"; nivel="$2"; base="${3:-origin/feature/rediseno-app}"; shift $(( $# >= 3 ? 3 : $# ))
cliente="${TYPESAFE_CLIENTE:-$HOME/projects/CleverTracker/tool/pedir_agente.py}"
[ -f "$cliente" ] || { echo "No encuentro el cliente de TypeSafe en $cliente" >&2; exit 2; }
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
copia="$tmp/$(basename "$ticket")"
sed -e 's/^- \*\*Owned files:\*\* /Ficheros en propiedad: /' \
    -e 's/^- \*\*Done when:\*\* /Terminado cuando: /' "$ticket" > "$copia"
exec python3 "$cliente" --ticket "$copia" --base "$base" --level "$nivel" "$@"
