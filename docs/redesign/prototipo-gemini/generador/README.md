# Cómo se construye el prototipo

`../index.html` sale del prototipo de Gemini Canvas (`.orca/drops/f1_bugambra_prototipo_redise_o.html`) con dos pasadas:

    cp .orca/drops/f1_bugambra_prototipo_redise_o.html docs/redesign/prototipo-gemini/index.html
    python3 -I docs/redesign/prototipo-gemini/generador/transform.py docs/redesign/prototipo-gemini/index.html docs/redesign/prototipo-gemini/generador/overlay.css
    python3 -I docs/redesign/prototipo-gemini/generador/patch2.py docs/redesign/prototipo-gemini/index.html docs/redesign/prototipo-gemini/generador

- `transform.py` + `overlay.css`: pilotos y escuderías reales, fotos, estilo común.
- `patch2.py`: calendario y temporadas reales, gráficos alineados, cartas por temporada, Origins por dúos, admin (economía, rivalidades, acta), TV con Twitch. Inserta los bloques `*-block.js` y `evo.css`.

## Datos

La página lee en vivo, sin sesión y solo lectura, Firestore (`liga-live.js`) y Twitch (`twitch-live.js`). Si falla la red, usa las copias:

- `liga.json`: se regenera con `node build-liga.cjs`.
- `twitch.json`: `node -e "require('./twitch-live.js').cargarTwitch(fetch).then(t=>require('fs').writeFileSync('twitch.json',JSON.stringify(t)))"`.
- `origins-detalle.json`: posiciones y banderas de Origins sacadas del Excel de la liga con `xl.py` y `origins.py` (Firestore solo guarda los puntos).

Siguen siendo de ejemplo: el libro de movimientos (exige sesión), OVR de pilotos sin rating, el buzón y los avisos. Ninguna acción del prototipo escribe en la liga.
