/* Lee de Firestore, por REST y sin sesión, lo que las reglas dejan leer a cualquiera (splits, circuitos,
   equipos, pilotos y, de usuarios, solo nombre, rol y escudería) y lo deja con la forma de LIGA.
   Solo lectura. Sirve en el navegador y en Node. */
(function (root) {
  'use strict';
  const BASE = 'https://firestore.googleapis.com/v1/projects/gen-lang-client-0829043813/databases/development/documents';
  const TEAM = { 'Alfa Romero': 'alfa', 'Zenith': 'zenith', 'Roses': 'roses' };
  const TEAM_ID = { equipo_alfa_romero: 'alfa', equipo_zenith: 'zenith', equipo_roses: 'roses', agente_libre: 'agente_libre' };
  const CIRC = {
    'GRAN BRETAÑA': ['Gran Bretaña', 'Silverstone'], 'BARÉIN': ['Baréin', 'Sakhir'], 'Barein': ['Baréin', 'Sakhir'],
    'ITALIA': ['Italia', 'Monza'], 'ESPAÑA': ['España', 'Barcelona'], 'MÓNACO': ['Mónaco', 'Montecarlo'], 'CANADÁ': ['Canadá', 'Montreal'],
    'Australia': ['Australia', 'Albert Park'], 'China': ['China', 'Shanghái'], 'Japón': ['Japón', 'Suzuka'],
    'Arabia Saudí': ['Arabia Saudí', 'Yeda'], 'Miami': ['Miami', 'Miami'], 'Canadá': ['Canadá', 'Montreal'],
    'Mónaco': ['Mónaco', 'Montecarlo'], 'Barcelona': ['España', 'Barcelona'], 'España': ['España', 'Barcelona'],
    'Austria': ['Austria', 'Red Bull Ring'], 'Gran Bretaña': ['Gran Bretaña', 'Silverstone'], 'Bélgica': ['Bélgica', 'Spa-Francorchamps'],
    'Hungría': ['Hungría', 'Hungaroring'], 'Países Bajos': ['Países Bajos', 'Zandvoort'], 'Italia': ['Italia', 'Monza'],
    'Imola': ['Italia', 'Imola'], 'IMOLA': ['Italia', 'Imola'], 'Emilia-Romaña': ['Emilia-Romaña', 'Imola'],
    'Azerbayán': ['Azerbaiyán', 'Bakú'], 'Azerbaiyán': ['Azerbaiyán', 'Bakú'], 'Singapur': ['Singapur', 'Marina Bay']
  };

  function val(v) {
    const t = Object.keys(v)[0], x = v[t];
    if (t === 'mapValue') { const o = {}; Object.keys(x.fields || {}).forEach(k => { o[k] = val(x.fields[k]); }); return o; }
    if (t === 'arrayValue') return (x.values || []).map(val);
    if (t === 'integerValue') return Number(x);
    if (t === 'nullValue') return null;
    return x;
  }

  async function cargarLiga(fetchImpl) {
    const get = async (p, extra = '') => {
      const r = await fetchImpl(`${BASE}/${p}?pageSize=300${extra}`);
      if (!r.ok) throw new Error(`Firestore ${r.status} en ${p}`);
      const j = await r.json();
      return (j.documents || []).map(d => {
        const o = { id: d.name.split('/').pop() };
        Object.keys(d.fields || {}).forEach(k => { o[k] = val(d.fields[k]); });
        return o;
      });
    };
    const slug = (id) => id.replace(/^piloto_/, '');
    const limpio = (s) => String(s || '').replace(/[★\s]+$/, '').trim();
    const splits = (await get('splits')).sort((a, b) => (a.orden || 0) - (b.orden || 0));
    // Solo estos tres campos: la colección guarda también correos y no hacen falta.
    const usuarios = await get('usuarios', '&mask.fieldPaths=nombre&mask.fieldPaths=rol&mask.fieldPaths=escuderia_id');
    const idEquipo = {};
    const temporadas = await Promise.all(splits.map(async (s) => {
      const [circ, eqs] = await Promise.all([get(`splits/${s.id}/circuitos`), get(`splits/${s.id}/equipos`)]);
      const gps = circ.sort((a, b) => a.numero_carrera - b.numero_carrera).map(c => {
        let [pais, circuito] = CIRC[c.nombre] || [c.nombre, c.nombre];
        // En el Split 3 el GP 16 es otra vez Italia, en Imola (la base de datos aún puede decir España).
        if (s.id === 'split_3' && c.numero_carrera === 16 && ['España', 'Italia'].includes(pais)) { pais = 'Italia'; circuito = 'Imola'; }
        const res = {};
        (c.resultados || []).forEach(r => {
          res[slug(r.pilotoId)] = { pos: r.isDnf ? 'DNF' : (r.racePos >= 1 && r.racePos < 99 ? r.racePos : '?'), pts: r.puntos || 0, q: r.qualyPos ?? null, vr: r.fastestLap === true, limpio: r.isClean, equipo: r.equipoId ? (TEAM_ID[r.equipoId] || null) : null };
        });
        return { id: c.id, economiaProcesada: !!c.economia_procesada, n: c.numero_carrera, pais, circuito, fecha: c.fecha ? String(c.fecha).slice(0, 10) : null, hora: c.hora || null, disputada: !!c.completado, res };
      });
      const equipos = [], pilotos = {};
      await Promise.all(eqs.filter(e => TEAM[e.nombre]).map(async (e) => {
        const ps = await get(`splits/${s.id}/equipos/${e.id}/pilotos`);
        ps.forEach(p => {
          pilotos[slug(p.id)] = {
            nombre: limpio(p.nombre), equipo: TEAM[e.nombre], pts: p.puntos_piloto || 0,
            victorias: p.victorias, podios: p.podios, poles: p.poles, vr: p.vueltas_rapidas, dnf: p.dnfs, limpias: p.carreras_limpias,
            ovr: Number(p.rating_piloto) > 0 ? Math.round(Number(p.rating_piloto)) : null, compra: p.precio_compra ?? null, clausula: p.clausula_actual ?? null, tipo: p.tipo_fichaje ?? null,
            mantener: p.mantener_actual ?? null, proxEquipo: p.pending_equipoId ? (TEAM_ID[p.pending_equipoId] || p.pending_equipoId) : null,
            historial: Object.fromEntries(Object.entries(p.historial_precios || {}).map(([k, v]) => [k, { m: v.mantener ?? null, c: v.clausula ?? null }]))
          };
        });
        equipos.push({
          id: TEAM[e.nombre], pts: e.puntos_constructores || 0, pilotos: ps.map(p => slug(p.id)),
          saldoInicial: e.presupuesto_inicial ?? null,
          saldoCierre: (e.economia_historica && e.economia_historica.presupuesto_cierre) ?? null,
          saldoActual: e.presupuesto ?? null,
          // Desglose del cierre (solo splits cerrados): lo mismo que la tabla «Resumen de escuderías».
          desglose: e.economia_historica ? {
            mercado: e.economia_historica.ajuste_fichajes ?? null, puntos: e.economia_historica.ingresos_puntos ?? null,
            pole: e.economia_historica.ingresos_poles ?? null, vr: e.economia_historica.ingresos_vueltas_rapidas ?? null,
            participacion: e.economia_historica.ingresos_participacion ?? null, limpias: e.economia_historica.ingresos_carreras_limpias ?? null,
            rivalidad: e.economia_historica.ingresos_rivalidades_carreras ?? null, premio: e.economia_historica.ajuste_premios ?? null,
            conciliado: !!e.economia_historica.conciliado
          } : null
        });
      }));
      eqs.forEach(e => { if (TEAM[e.nombre]) idEquipo[e.id] = TEAM[e.nombre]; });
      const individual = s.tipo === 'individual';
      // Origins se corrió por dúos: dos pilotos que suman juntos.
      const duos = (s.duos || []).map(d => ({
        nombre: d.nombre, pts: d.puntos || 0, porGp: d.puntos_carreras || [],
        pilotos: String(d.nombre).split('/').map(n => n.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
      })).sort((a, b) => b.pts - a.pts);
      if (individual) {
        gps.forEach(g => Object.entries(g.res).forEach(([k, r]) => {
          pilotos[k] = pilotos[k] || { nombre: k[0].toUpperCase() + k.slice(1), equipo: null, pts: 0 };
          pilotos[k].pts += r.pts;
        }));
      }
      const rivalidades = ((s.rivalries && s.rivalries.groups) || []).map(g => ({
        id: g.id, pilotos: (g.members || []).map(m => slug(m.id))
      }));
      return { id: s.id, nombre: s.nombre, tipo: individual ? 'individual' : 'equipos', enCurso: !!s.activo, gps, equipos, pilotos, duos, rivalidades };
    }));
    const responsables = {};
    usuarios.forEach(u => {
      const eq = idEquipo[u.escuderia_id];
      if (!eq) return;
      responsables[eq] = responsables[eq] || {};
      if (u.rol === 'jeque') responsables[eq].jeque = u.nombre;
      if (u.rol === 'director_deportivo') responsables[eq].director = u.nombre;
    });
    // Un split recién creado (por ejemplo al pactar) aún no tiene calendario: no se muestra hasta tenerlo.
    return { temporadas: temporadas.filter(t => t.gps.length), responsables };
  }

  root.cargarLiga = cargarLiga;
  if (typeof module !== 'undefined') module.exports = { cargarLiga };
})(typeof window !== 'undefined' ? window : globalThis);
