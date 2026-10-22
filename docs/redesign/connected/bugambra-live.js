/* Lectura SOLO LECTURA de los datos públicos de Firestore (reglas: splits, equipos, pilotos y circuitos
   se pueden leer sin sesión) y adaptación al `state` del prototipo. No escribe nunca, no usa sesión,
   no guarda nada. Si falla la red, el prototipo sigue con sus datos ficticios y lo dice en un aviso. */
(function (root) {
  'use strict';
  var CONFIG = { projectId: 'gen-lang-client-0829043813', database: 'development', apiKey: '' };
  var MILLION = 1000000; // presupuestos y precios están en millones (ver docs/economia-y-fichajes.md)

  function val(v) {
    var t = Object.keys(v)[0], x = v[t];
    if (t === 'mapValue') { var o = {}; Object.keys(x.fields || {}).forEach(function (k) { o[k] = val(x.fields[k]); }); return o; }
    if (t === 'arrayValue') return (x.values || []).map(val);
    if (t === 'integerValue') return Number(x);
    if (t === 'doubleValue') return x;
    if (t === 'nullValue') return null;
    return x;
  }
  function doc(d) {
    var o = { id: d.name.split('/').pop() };
    Object.keys(d.fields || {}).forEach(function (k) { o[k] = val(d.fields[k]); });
    return o;
  }

  function spanishDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? m[3] + '/' + m[2] + '/' + m[1] : 'Fecha por confirmar';
  }
  function status(r) { // misma regla que raceResultStatus de readModels.ts
    if (r.isDnf) return 'dnf';
    return Number.isInteger(r.racePos) && r.racePos >= 1 && r.racePos < 99 ? 'classified' : 'unknown_position';
  }

  /** Función pura: recibe lo leído de Firestore y devuelve las piezas del state. */
  function mapLiveData(raw) {
    var teamsRaw = raw.equipos.filter(function (e) { return e.id !== 'agente_libre'; })
      .sort(function (a, b) { return (b.puntos_constructores || 0) - (a.puntos_constructores || 0); });
    var leader = teamsRaw.length ? (teamsRaw[0].puntos_constructores || 0) : 0;
    var equipos = teamsRaw.map(function (e, i) {
      var pts = e.puntos_constructores || 0;
      return {
        id: e.id, nombre: e.nombre, jeque: 'Jeque de la escudería', swatch: 'swatch-p' + (i % 4 + 1),
        posicion: i + 1, puntos: pts, diferenciaLider: i === 0 ? '0 pts (Líder)' : '−' + (leader - pts) + ' pts',
        saldo: Math.round((e.presupuesto || 0) * MILLION * 100) / 100, motor: '—', sede: '—',
        pilotosIds: (raw.rosters[e.id] || []).map(function (p) { return p.id; })
      };
    });
    var all = [];
    Object.keys(raw.rosters).forEach(function (teamId) {
      raw.rosters[teamId].forEach(function (p) {
        all.push({
          id: p.id, nombre: p.nombre || p.id, dorsal: '—', escuderiaId: teamId === 'agente_libre' ? null : teamId,
          puntos: p.puntos_piloto || 0, diff: '', podios: p.podios || 0, ritmoMedio: '—',
          valor: Math.abs(p.precio_compra || 0) * MILLION,
          estadoMercado: teamId === 'agente_libre' ? 'Libre' : 'Fichado'
        });
      });
    });
    var top = all.reduce(function (m, p) { return Math.max(m, p.puntos); }, 0);
    all.forEach(function (p) { p.diff = p.puntos === top ? '0 pts (Líder)' : '−' + (top - p.puntos) + ' pts'; });
    var names = {}; all.forEach(function (p) { names[p.id] = p.nombre; });

    var circ = raw.circuitos.slice().sort(function (a, b) { return (a.numero_carrera || 99) - (b.numero_carrera || 99); });
    var nextId = null;
    circ.forEach(function (c) { if (!c.completado && nextId === null) nextId = c.id; });
    var carreras = circ.map(function (c, i) {
      var res = (c.resultados || []).slice().sort(function (a, b) { return (a.racePos || 99) - (b.racePos || 99); })
        .map(function (r) {
          var s = status(r);
          return {
            pilotoId: r.pilotoId,
            estado: s === 'classified' ? 'POSICION' : s === 'dnf' ? 'DNF' : 'POSICION_DESCONOCIDA',
            posicion: s === 'classified' ? r.racePos : null,
            tiempo: s === 'classified' ? '—' : s === 'dnf' ? 'DNF' : 'Posición desconocida',
            puntos: r.puntos || 0
          };
        });
      return {
        id: c.id, ronda: 'R' + String(c.numero_carrera || i + 1).padStart(2, '0'), nombre: c.nombre,
        fecha: spanishDate(c.fecha), estado: c.completado ? 'Disputada' : (c.id === nextId ? 'Próxima carrera' : 'Pendiente'),
        notaFia: (c.decisiones_fia && c.decisiones_fia.length) ? c.decisiones_fia.map(function (d) { return d.tipo + ': ' + d.motivo; }).join(' · ') : 'Sin decisiones FIA registradas.',
        resultados: res
      };
    });
    var next = carreras.filter(function (c) { return c.id === nextId; })[0];
    return { equipos: equipos, pilotos: all, carreras: carreras, names: names, proximaCarrera: next || null };
  }

  /** Lee el split activo (o el último). Devuelve la forma `raw` que espera mapLiveData. */
  function loadLive(fetchImpl, cfg) {
    cfg = cfg || CONFIG;
    var base = 'https://firestore.googleapis.com/v1/projects/' + cfg.projectId + '/databases/' + cfg.database + '/documents';
    var key = cfg.apiKey ? '&key=' + encodeURIComponent(cfg.apiKey) : '';
    function get(p) {
      return fetchImpl(base + '/' + p + (p.indexOf('?') >= 0 ? '&' : '?') + 'pageSize=300' + key)
        .then(function (r) { if (!r.ok) throw new Error('Firestore ' + r.status); return r.json(); })
        .then(function (j) { return (j.documents || []).map(doc); });
    }
    return get('splits').then(function (splits) {
      var s = splits.filter(function (x) { return x.activo; })[0] || splits.sort(function (a, b) { return (b.orden || 0) - (a.orden || 0); })[0];
      if (!s) throw new Error('No hay splits');
      return Promise.all([get('splits/' + s.id + '/equipos'), get('splits/' + s.id + '/circuitos')]).then(function (r) {
        var equipos = r[0], rosters = {};
        return Promise.all(equipos.map(function (e) {
          return get('splits/' + s.id + '/equipos/' + e.id + '/pilotos').then(function (p) { rosters[e.id] = p; });
        })).then(function () { return { split: s, equipos: equipos, rosters: rosters, circuitos: r[1] }; });
      });
    });
  }

  /** Aplica el mapeo al `state` vivo del prototipo y repinta. */
  function applyToState(state, mapped, splitName) {
    state.equipos = mapped.equipos; state.pilotos = mapped.pilotos; state.carreras = mapped.carreras;
    // El libro de movimientos real exige sesión: no mezclar saldos reales con movimientos inventados.
    state.movimientos = [];
    if (mapped.proximaCarrera) {
      state.proximaCarrera = { id: mapped.proximaCarrera.id, nombre: mapped.proximaCarrera.nombre, circuito: mapped.proximaCarrera.nombre,
        fechaTexto: mapped.proximaCarrera.fecha, cuentaAtras: 'Según calendario de la liga', vueltas: '—' };
      state.selectedRaceId = mapped.proximaCarrera.id;
    } else if (mapped.carreras.length) state.selectedRaceId = mapped.carreras[mapped.carreras.length - 1].id;
    if (mapped.equipos.length) state.selectedTeamId = mapped.equipos[0].id;
    state.currentUser.escuderiaId = state.selectedTeamId;
    state.datosEnVivo = { split: splitName, origen: 'Firestore (lectura pública)' };
  }

  root.BugambraLive = { mapLiveData: mapLiveData, loadLive: loadLive, applyToState: applyToState, CONFIG: CONFIG };
  if (typeof module !== 'undefined') module.exports = root.BugambraLive;
})(typeof window !== 'undefined' ? window : globalThis);
