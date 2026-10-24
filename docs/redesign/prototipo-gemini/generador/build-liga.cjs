// Copia de respaldo de LIGA (por si falla la red en el navegador), con el mismo lector que usa la página.
const { cargarLiga } = require('./liga-live.js');
cargarLiga(fetch).then(liga => {
  require('fs').writeFileSync(__dirname + '/liga.json', JSON.stringify(liga));
  console.log(liga.responsables, liga.temporadas[0].duos.map(d=>d.nombre+'='+d.pts+' '+d.pilotos));
  for (const s of liga.temporadas) console.log(s.nombre, s.enCurso ? '(en curso)' : '', s.gps.map(g => g.n + g.pais + (g.disputada ? '✓' : '')).join(' '));
}).catch(e => { console.error(e); process.exit(1); });
