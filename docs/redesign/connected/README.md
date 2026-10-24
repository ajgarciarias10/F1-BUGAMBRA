# Prototipo oficial conectado (solo lectura)

`index.html` es el prototipo hecho en Gemini Canvas (`.orca/drops/f1_bugambra_prototipo_oficial.html`) sin cambios, más dos scripts al final: `bugambra-live.js` lee de Firestore, por REST y sin sesión, lo que las reglas ya dejan leer a un invitado (split activo, equipos, plantillas y circuitos), y lo adapta al `state` del prototipo. Nunca escribe.

- Reales: escuderías, puntos y saldo (presupuesto en millones × 1.000.000), pilotos con puntos, podios y si son agentes libres, calendario, estado de cada carrera, resultados y decisiones FIA.
- Siguen ficticios: movimientos (vacío: el libro real exige sesión), foro, votación, archivo, buzón, medios, usuarios y telemetría.
- Si falla la red, se queda con los datos de ejemplo y lo avisa.

Servir: `python3 -m http.server 18476` en esta carpeta. Comprobar el mapeo sin navegador: cargar `bugambra-live.js` en Node y llamar a `loadLive(fetch)` y `mapLiveData`.
