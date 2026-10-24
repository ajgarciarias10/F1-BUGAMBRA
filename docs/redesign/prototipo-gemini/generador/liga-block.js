    /* ==========================================================================
       HISTORIA DE LA LIGA: calendario, puntos por GP, plantillas y saldos de cada split
       (copia de la lectura pública de Firestore). Las temporadas se enlazan así:
       - Splits 1, 2 y 3 forman la Temporada 1 y numeran los GP seguidos (1–6, 7–12, 13–18).
       - El saldo de salida de un split es el saldo de cierre del anterior.
       - Origins fue un mundial individual previo, sin escuderías.
       ========================================================================== */
__LIVE__
    const DATOS_LIGA = __LIGA__;
    const LIGA = DATOS_LIGA.temporadas;
    const RESPONSABLES = DATOS_LIGA.responsables;
    // Responsables que la liga ha confirmado pero aún no están asignados en la base de datos.
    const RESPONSABLES_CONFIRMADOS = { alfa: { director: 'Antonio Ceferi' } };
    function completarResponsables() {
      Object.entries(RESPONSABLES_CONFIRMADOS).forEach(([id, r]) => {
        RESPONSABLES[id] = { ...r, ...(RESPONSABLES[id] || {}) };
        Object.keys(r).forEach(k => { if (!RESPONSABLES[id][k]) RESPONSABLES[id][k] = r[k]; });
      });
    }
    completarResponsables();
    // Origins, del Excel de la liga: Firestore solo guarda los puntos. La posición sale de los puntos estándar
    // (puntos de la carrera menos los extra) y las banderas valen 1 si se cumplen y 0 si no.
    const ORIGINS_DETALLE = __ORIGINS__;
    function completarOrigins() {
      const o = LIGA.find(t => t.tipo === 'individual');
      if (!o) return;
      o.gps.forEach(g => {
        const det = ORIGINS_DETALLE[g.n];
        if (!det) return;
        Object.entries(det.pilotos).forEach(([slug, x]) => {
          if (!g.res[slug]) return;
          g.res[slug].pos = x.pos;
          g.res[slug].det = x;
        });
        g.doble = det.doble;
      });
    }
    const SERIE_EQUIPO = { alfa: { dash: '' }, zenith: { dash: '8 5' }, roses: { dash: '2 4' } };
    const ORDEN_SERIE = ['alfa', 'zenith', 'roses'];
    const CODIGO_GP = {
      'Australia': 'AUS', 'China': 'CHN', 'Japón': 'JPN', 'Arabia Saudí': 'KSA', 'Miami': 'MIA', 'Baréin': 'BHR',
      'Canadá': 'CAN', 'Mónaco': 'MON', 'España': 'ESP', 'Austria': 'AUT', 'Gran Bretaña': 'GBR', 'Bélgica': 'BEL',
      'Hungría': 'HUN', 'Países Bajos': 'NED', 'Italia': 'ITA', 'Azerbaiyán': 'AZE', 'Singapur': 'SIN'
    };
    const CODIGO_CIRCUITO = { 'Imola': 'IMO' };
    const codigoGp = (g) => CODIGO_CIRCUITO[g.circuito] || CODIGO_GP[g.pais] || g.pais.slice(0, 3).toUpperCase();
    const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

    const fmtM = (n) => n == null ? '—' : `${n.toFixed(1).replace('.', ',')} M€`;
    const fmtDelta = (n) => n == null ? '—' : `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(1).replace('.', ',')}`;
    const fechaCorta = (iso) => {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
      return m ? `${m[3]} ${MESES[Number(m[2]) - 1]} ${m[1]}` : null;
    };
    const posTexto = (pos) => pos === 'DNF' ? 'DNF' : pos === '?' ? 'Posición desconocida' : pos === '11–20' ? 'Entre 11.º y 20.º' : `${pos}.º`;

    /** Escudería del usuario del prototipo: el jeque es de Zenith, el director deportivo de Roses y el piloto,
        la de Fabi. El comisario (admin) y un usuario sin más no tienen escudería. */
    function miEquipoId() {
      const role = state.ui.role;
      if (role === 'jeque') return 'zenith';
      if (role === 'director') return RESPONSABLES.roses && RESPONSABLES.roses.director ? 'roses' : 'zenith';
      if (role === 'piloto') { const fabi = state.pilotos.find(p => p.slug === 'fabi'); return fabi ? fabi.equipoId : null; }
      return null;
    }
    function miNombre(role) {
      const eq = miEquipoId();
      return ({ usuario: 'Álex', piloto: 'Fabi', admin: 'Comisario', jeque: (RESPONSABLES.zenith || {}).jeque, director: (RESPONSABLES[eq] || {}).director })[role || state.ui.role] || 'bienvenido';
    }
    Object.defineProperty(state, 'movimientos', {
      configurable: true,
      get() { return (state.movimientosPorEquipo || {})[miEquipoId()] || []; },
      set(v) { state.movimientosPorEquipo = { ...(state.movimientosPorEquipo || {}), [miEquipoId()]: v }; }
    });
    Object.defineProperty(state, 'fichajes', {
      configurable: true,
      get() { return (state.fichajesPorEquipo || {})[miEquipoId()] || []; },
      set(v) { state.fichajesPorEquipo = { ...(state.fichajesPorEquipo || {}), [miEquipoId()]: v }; }
    });

    /** Niveles de la carta, los mismos que la web real (PilotCardF1). */
    function nivelDe(ovr) {
      if (typeof ovr !== 'number') return '—';
      return ovr >= 90 ? 'ELITE' : ovr >= 85 ? 'PRO' : ovr >= 80 ? 'ADV' : 'CORE';
    }

    /** Carta de un piloto tal como estaba en una temporada: su escudería, su valoración y sus carreras de entonces. */
    function cartaDeTemporada(slug, nombreTemporada) {
      const t = temporadaPorNombre(nombreTemporada);
      const r = t.pilotos[slug];
      if (!r) return null;
      const base = state.pilotos.find(x => x.slug === slug) || { id: slug, slug, nombrePila: '', nombre: r.nombre };
      const corridas = t.gps.filter(g => g.disputada && g.res[slug]);
      const res = corridas.map(g => g.res[slug]);
      const pos = res.map(x => x.pos).filter(x => typeof x === 'number');
      const cuenta = (f) => res.filter(f).length;
      const ovr = r.ovr ?? (t.agregada ? base.ovr : null);
      return {
        ...base, temporadaCarta: t.nombre,
        equipoId: r.equipo, equipoVirtual: r.equipo ? null : { id: null, nombre: 'Individual', surfaceClass: '', colorHex: '#8a8a8a', siglas: 'ORI' },
        ovr: ovr ?? '—', nivel: nivelDe(ovr), puntos: r.pts,
        victorias: r.victorias ?? cuenta(x => x.pos === 1), podios: r.podios ?? cuenta(x => typeof x.pos === 'number' && x.pos <= 3),
        poles: r.poles ?? cuenta(x => x.det && x.det.pole), vr: r.vr ?? cuenta(x => x.det && x.det.vr),
        dnf: r.dnf ?? cuenta(x => x.pos === 'DNF'), limpias: r.limpias ?? cuenta(x => x.det && x.det.limpio),
        mediaQualy: '—',
        mediaCarrera: pos.length ? (pos.reduce((s, x) => s + x, 0) / pos.length).toFixed(1).replace('.', ',') : '—',
        mediaPuntos: corridas.length ? (r.pts / corridas.length).toFixed(1).replace('.', ',') : '—',
        clausula: '—', mantener: '—',
        evolucion: corridas.map(g => ({
          gp: `GP ${g.n} · ${g.pais}`, pos: posTexto(g.res[slug].pos), pts: g.res[slug].pts,
          vr: !!(g.res[slug].det && g.res[slug].det.vr), pilotoDia: !!(g.res[slug].det && g.res[slug].det.pdd)
        }))
      };
    }

    function temporadaActual() { return LIGA.find(t => t.enCurso) || LIGA[LIGA.length - 1]; }
    const TEMPORADA_1 = 'Temporada 1';
    function temporadaPorNombre(nombre) {
      if (nombre === TEMPORADA_1) return temporadaAgregada();
      return LIGA.find(t => t.nombre === nombre) || temporadaActual();
    }
    function splitsDelAno() { return LIGA.filter(t => t.tipo === 'equipos'); }

    /** Temporada 1 entera: los tres splits seguidos. Suma puntos de pilotos y escuderías; cada GP
        guarda los puntos de escudería con la plantilla de su propio split. */
    function temporadaAgregada() {
      const splits = splitsDelAno();
      const gps = splits.flatMap(s => s.gps.map(g => ({
        ...g, ptsEquipo: Object.fromEntries(s.equipos.map(e => [e.id, puntosEquipoEnGp(s, e.id, g)]))
      })));
      const pilotos = {};
      splits.forEach(s => Object.entries(s.pilotos).forEach(([slug, p]) => {
        const a = pilotos[slug] || (pilotos[slug] = { nombre: p.nombre, pts: 0, equipos: [] });
        a.pts += p.pts;
        a.equipo = p.equipo;
        if (typeof p.ovr === 'number') a.ovr = p.ovr; // última valoración conocida
        if (a.equipos[a.equipos.length - 1] !== p.equipo) a.equipos.push(p.equipo);
      }));
      const ids = [...new Set(splits.flatMap(s => s.equipos.map(e => e.id)))];
      const ultimo = splits[splits.length - 1];
      const equipos = ids.map(id => {
        const de = splits.map(s => s.equipos.find(e => e.id === id)).filter(Boolean);
        const actual = de[de.length - 1];
        // Todos los pilotos que han corrido para la escudería, con los puntos que le dieron y en qué splits.
        const porPiloto = {};
        splits.forEach(s => {
          const e = s.equipos.find(x => x.id === id);
          if (!e) return;
          e.pilotos.forEach(slug => {
            const x = porPiloto[slug] || (porPiloto[slug] = { pts: 0, splits: [] });
            x.pts += (s.pilotos[slug] || {}).pts || 0;
            x.splits.push(s.nombre);
          });
        });
        return {
          id, pts: de.reduce((s, e) => s + e.pts, 0), pilotos: Object.keys(porPiloto), porPiloto,
          saldoInicial: de[0].saldoInicial, saldoCierre: actual.saldoCierre, saldoActual: actual.saldoActual
        };
      });
      return {
        id: 'temporada_1', nombre: TEMPORADA_1, tipo: 'equipos', agregada: true,
        enCurso: splits.some(s => s.enCurso), gps, equipos, pilotos, duos: [], ultimoSplit: ultimo.nombre
      };
    }
    function nombreEquipo(id) { return id ? getEquipo(id).nombre : 'Individual'; }

    /** Puntos que suma una escudería en un GP: los de los pilotos de su plantilla en ese split. */
    function puntosEquipoEnGp(t, equipoId, g) {
      if (g.ptsEquipo) return g.disputada ? (g.ptsEquipo[equipoId] ?? null) : null;
      const eq = t.equipos.find(e => e.id === equipoId);
      if (!eq || !g.disputada) return null;
      return eq.pilotos.reduce((s, slug) => s + (g.res[slug] ? g.res[slug].pts : 0), 0);
    }

    function clasificacionPilotos(t) {
      return Object.entries(t.pilotos)
        .map(([slug, p]) => ({ slug, ...p }))
        .sort((a, b) => b.pts - a.pts);
    }

    function clasificacionEquipos(t) {
      return t.equipos.slice().sort((a, b) => b.pts - a.pts);
    }

    /** «GP 15 · 3 de 6»: número del GP en la temporada y su orden dentro del split. */
    function etiquetaGp(ev) {
      return `GP ${ev.orden} · ${ev.enSplit} de ${ev.splitTotal} del split`;
    }

    function trayectoriaPiloto(slug) {
      return LIGA.filter(t => t.pilotos[slug]).map(t => {
        const pos = clasificacionPilotos(t).findIndex(p => p.slug === slug) + 1;
        return {
          split: t.nombre,
          escuderia: nombreEquipo(t.pilotos[slug].equipo),
          puesto: `${pos}.º${t.enCurso ? ' provisional' : ''}`,
          puntos: t.pilotos[slug].pts
        };
      });
    }

    // Reglas por defecto de la web real (utils/economyRules.ts).
    const REGLAS_ECO = {
      puntosFactor: 0.1, pole: 2, vr: 1, participacion: 4, sinSancionados: 3,
      rivalClasif: [1, 0.5, 0], rivalCarrera: [2, 1, 0], rivalDuoClasif: [1, 0], rivalDuoCarrera: [2, 0]
    };
    const NOMBRE_FUENTE = { puntos: 'Puntos', pole: 'Pole', vr: 'Vuelta rápida', participacion: 'Participación', limpias: 'Sin sanciones', rivalidad: 'Rivalidad' };

    /** Ingresos de cada escudería en un circuito, con la misma lógica que procesarEconomiaCarrera. */
    function desgloseCircuito(t, g) {
      const lineas = {};
      const add = (eq, fuente, importe, texto) => {
        if (!eq || !importe) return;
        (lineas[eq] = lineas[eq] || []).push({ fuente, importe: +importe.toFixed(2), texto });
      };
      const equipoDe = (slug) => (g.res[slug] && g.res[slug].equipo) || (t.pilotos[slug] || {}).equipo;
      const nombre = (slug) => (t.pilotos[slug] || {}).nombre || slug;
      const participan = new Set(), sancionados = new Set();
      Object.entries(g.res).forEach(([slug, r]) => {
        const eq = equipoDe(slug);
        if (!eq) return;
        participan.add(eq);
        if (r.limpio === false) sancionados.add(eq);
        add(eq, 'puntos', r.pts * REGLAS_ECO.puntosFactor, `${nombre(slug)}: ${r.pts} pts × ${REGLAS_ECO.puntosFactor}`);
        if (r.q === 1) add(eq, 'pole', REGLAS_ECO.pole, `${nombre(slug)}: pole`);
        if (r.vr) add(eq, 'vr', REGLAS_ECO.vr, `${nombre(slug)}: vuelta rápida`);
      });
      (t.rivalidades || []).forEach(grupo => {
        const duo = grupo.pilotos.length === 2;
        const presentes = grupo.pilotos.filter(s => g.res[s]);
        [['q', duo ? REGLAS_ECO.rivalDuoClasif : REGLAS_ECO.rivalClasif, 'clasificación'], ['pos', duo ? REGLAS_ECO.rivalDuoCarrera : REGLAS_ECO.rivalCarrera, 'carrera']]
          .forEach(([campo, premios, cual]) => {
            presentes.filter(s => Number.isInteger(g.res[s][campo]) && g.res[s][campo] > 0 && g.res[s][campo] < 99)
              .sort((a, b) => g.res[a][campo] - g.res[b][campo])
              .forEach((s, i) => add(equipoDe(s), 'rivalidad', premios[i] || 0, `${nombre(s)}: rivalidad de ${cual}, ${i + 1}.º de ${grupo.pilotos.map(nombre).join('/')}`));
          });
      });
      participan.forEach(eq => {
        add(eq, 'participacion', REGLAS_ECO.participacion, 'Participación del equipo');
        if (!sancionados.has(eq)) add(eq, 'limpias', REGLAS_ECO.sinSancionados, 'Equipo sin sancionados');
      });
      return lineas;
    }

    function ingresosSplit(t) {
      const total = {};
      t.gps.filter(g => g.disputada).forEach(g => Object.entries(desgloseCircuito(t, g)).forEach(([eq, ls]) => ls.forEach(l => {
        total[eq] = total[eq] || {};
        total[eq][l.fuente] = +((total[eq][l.fuente] || 0) + l.importe).toFixed(2);
      })));
      return total;
    }

    /** Pilotos de la escudería en el split en curso con su precio de compra real. */
    function operacionesMercado(equipoId) {
      const t = temporadaActual();
      const eq = t.equipos.find(e => e.id === equipoId);
      return eq.pilotos.map(slug => ({ slug, ...t.pilotos[slug] })).filter(p => p.compra != null);
    }

    /** Saldo de la escudería en el split en curso. Todo real: la salida (cierre del split anterior), lo que sumó
        en cada GP (resultados + reglas, igual que «Procesar economía») y el saldo actual. El mercado es lo que queda:
        fichajes, cláusulas y renovaciones antes de la primera carrera. */
    function historialSaldo(equipoId) {
      const t = temporadaActual();
      const eq = t.equipos.find(e => e.id === equipoId);
      const jugados = t.gps.filter(g => g.disputada);
      const ingresos = jugados.map(g => +((desgloseCircuito(t, g)[equipoId] || []).reduce((s, x) => s + x.importe, 0)).toFixed(1));
      const mercado = +(eq.saldoActual - eq.saldoInicial - ingresos.reduce((s, x) => s + x, 0)).toFixed(1);
      const filas = [{ clave: 'salida', gp: `Salida · de ${LIGA[LIGA.indexOf(t) - 1].nombre}`, saldo: eq.saldoInicial, delta: null, hito: null, real: true }];
      let saldo = eq.saldoInicial + mercado;
      filas.push({
        clave: 'mercado', gp: 'Mercado · antes del GP ' + t.gps[0].n, saldo: +saldo.toFixed(1), delta: mercado,
        hito: { tipo: mercado < 0 ? 'fichaje' : 'venta', etiqueta: operacionesMercado(equipoId).map(p => p.nombre).join(', ') }
      });
      t.gps.forEach(g => {
        if (!g.disputada) {
          filas.push({ clave: 'gp' + g.n, gp: `GP ${g.n} · ${g.pais}`, codigo: codigoGp(g), orden: g.n, saldo: null, delta: null, hito: null, pendiente: true });
          return;
        }
        const ing = ingresos[jugados.indexOf(g)];
        saldo += ing;
        filas.push({ clave: 'gp' + g.n, gp: `GP ${g.n} · ${g.pais}`, codigo: codigoGp(g), orden: g.n, saldo: +saldo.toFixed(1), delta: ing, hito: null });
      });
      return filas;
    }

    /** Pone el split en curso real en el state: calendario, puntos, saldos, trayectorias y palmarés. */
    function aplicarLiga() {
      completarOrigins();
      const t = temporadaActual();
      const prox = t.gps.find(g => !g.disputada);
      state.temporada.split = t.nombre;
      state.temporada.temporadasDisponibles = LIGA.map(x => x.nombre);
      state.temporada.totalCarreras = t.gps[t.gps.length - 1].n;
      if (prox) {
        Object.assign(state.temporada.proximoEvento, {
          orden: prox.n, total: t.gps[t.gps.length - 1].n, enSplit: t.gps.indexOf(prox) + 1, splitTotal: t.gps.length,
          pais: prox.pais, circuito: prox.circuito
        });
        state.temporada.proximoEvento.sinFecha = !prox.fecha;
        if (!prox.fecha) state.temporada.proximoEvento.fechaTexto = 'Fecha por confirmar';
        if (prox.fecha) {
          const hora = prox.hora || '22:30';
          const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
          const objetivo = new Date(`${prox.fecha}T${hora}:00+02:00`);
          const pasada = objetivo.getTime() < Date.now();
          Object.assign(state.temporada.proximoEvento, {
            isoTarget: objetivo.toISOString(),
            fechaTexto: `${dias[objetivo.getDay()]} ${fechaCorta(prox.fecha).replace(/ \d{4}$/, '')} · ${hora}${pasada ? ' · pendiente de resultados' : ' (hora peninsular)'}`
          });
        }
      }

      const eqOrden = clasificacionEquipos(t);
      state.equipos.forEach(e => {
        const r = t.equipos.find(x => x.id === e.id);
        if (!r) return;
        e.puntos = r.pts;
        e.puesto = eqOrden.indexOf(r) + 1;
        e.presupuestoNum = r.saldoActual;
        e.presupuesto = fmtM(r.saldoActual);
        e.valorTotal = fmtM(r.saldoActual + e.valorPlantillaNum);
        e.finanzasAdmin.inicial = r.saldoInicial;
        e.historialCircuitos = historialSaldo(e.id);
        e.finanzasAdmin.mercado = e.historialCircuitos[1].delta;
      });

      state.pilotos.forEach(p => {
        const r = t.pilotos[p.slug];
        if (!r) return;
        if (typeof r.ovr === 'number') { p.ovr = r.ovr; p.nivel = nivelDe(r.ovr); }
        Object.assign(p, {
          puntos: r.pts, victorias: r.victorias ?? 0, podios: r.podios ?? 0, poles: r.poles ?? 0,
          vr: r.vr ?? 0, dnf: r.dnf ?? 0, limpias: r.limpias ?? 0
        });
        p.evolucion = t.gps.filter(g => g.disputada).map(g => {
          const x = g.res[p.slug];
          return { gp: `GP ${g.n} · ${g.pais}`, pos: x ? posTexto(x.pos) : 'No corrió', pts: x ? x.pts : 0, vr: false, pilotoDia: false };
        });
        p.trayectoria = trayectoriaPiloto(p.slug);
        // Medias del split en curso, calculadas de los resultados (la qualy no se guarda en la base de datos).
        const corridas = t.gps.filter(g => g.disputada && g.res[p.slug]);
        const posiciones = corridas.map(g => g.res[p.slug].pos).filter(x => typeof x === 'number');
        p.mediaCarrera = posiciones.length ? `${(posiciones.reduce((s, x) => s + x, 0) / posiciones.length).toFixed(1).replace('.', ',')}` : '—';
        p.mediaPuntos = corridas.length ? (r.pts / corridas.length).toFixed(1).replace('.', ',') : '—';
        p.mediaQualy = '—';
      });
      state.pilotos.sort((a, b) => b.puntos - a.puntos);

      // Precio de compra y cláusula reales del split en curso; el valor de las fichas es la suma de cláusulas.
      state.pilotos.forEach(p => {
        const r = t.pilotos[p.slug];
        if (!r || r.compra == null) return;
        p.precioCompra = fmtM(r.compra);
        p.clausulaNum = r.clausula;
        p.clausula = fmtM(r.clausula);
      });
      state.equipos.forEach(e => {
        const plantilla = state.pilotos.filter(p => p.equipoId === e.id);
        const ovrs = plantilla.map(p => p.ovr).filter(o => typeof o === 'number');
        if (ovrs.length) e.mediaOvr = Math.round(ovrs.reduce((s, o) => s + o, 0) / ovrs.length);
        e.valorPlantillaNum = +plantilla.reduce((s, p) => s + (p.clausulaNum || 0), 0).toFixed(1);
        e.valorPlantilla = fmtM(e.valorPlantillaNum);
        e.valorTotal = fmtM(e.presupuestoNum + e.valorPlantillaNum);
      });

      // Fichajes y movimientos de cada escudería, colgados del calendario real. Mi escudería enseña los de la suya.
      const TIPO = { fichaje: 'Fichaje', clausula: 'Cláusula', mantener: 'Renovación', subasta: 'Subasta' };
      const primerGp = t.gps[0];
      state.fichajesPorEquipo = {};
      state.movimientosPorEquipo = {};
      state.equipos.forEach(e => {
        const ops = operacionesMercado(e.id);
        state.fichajesPorEquipo[e.id] = ops.map((p, i) => ({
          id: 'f' + (i + 1), piloto: p.nombre, pilotoSlug: p.slug, tipo: TIPO[p.tipo] || 'Fichaje',
          importe: `${p.compra >= 0 ? '−' : '+'}${fmtM(Math.abs(p.compra))}`, gp: `Mercado · antes del GP ${primerGp.n}`,
          detalle: `Precio de compra para el ${t.nombre}`
        }));
        const movs = [];
        let saldo = e.historialCircuitos[0].saldo;
        const push = (m) => { saldo = +(saldo + m.importeNum).toFixed(1); movs.push({ ...m, importe: `${m.importeNum >= 0 ? '+' : '−'}${fmtM(Math.abs(m.importeNum))}`, saldoDespues: fmtM(saldo) }); };
        ops.forEach(p => push({
          fecha: fechaCorta(primerGp.fecha) ? `antes del ${fechaCorta(primerGp.fecha)}` : '—', gp: `Mercado · ${t.nombre}`,
          fuente: 'Fichajes y cláusulas', concepto: `${TIPO[p.tipo] || 'Fichaje'} de ${p.nombre}`, importeNum: -p.compra,
          piloto: p.nombre, referencia: `MERCADO-${t.id.toUpperCase()}-${p.slug.toUpperCase()}`
        }));
        e.historialCircuitos.filter(h => h.orden && !h.pendiente).forEach(h => {
          const g = t.gps.find(x => x.n === h.orden);
          const part = +(Math.min(1.5, h.delta)).toFixed(1);
          const pil = ops.filter(p => g.res[p.slug]);
          push({ fecha: fechaCorta(g.fecha), gp: h.gp, fuente: 'Participación', concepto: `Participación de ${pil.length} pilotos en ${g.pais}`,
            importeNum: part, piloto: `Plantilla ${e.nombre}`, referencia: `ACTA-GP${g.n}-PAR` });
          push({ fecha: fechaCorta(g.fecha), gp: h.gp, fuente: 'Puntos de carrera',
            concepto: pil.map(p => `${p.nombre} ${posTexto(g.res[p.slug].pos)}`).join(', '),
            importeNum: +(h.delta - part).toFixed(1), piloto: pil.map(p => p.nombre).join(' / '), referencia: `ACTA-GP${g.n}-PTS` });
        });
        state.movimientosPorEquipo[e.id] = movs.reverse().map((m, i) => ({ id: 'm' + (i + 1), ...m }));
      });

      // Jeques y directores deportivos reales (colección usuarios, solo nombre, rol y escudería).
      state.equipos.forEach(e => {
        const r = RESPONSABLES[e.id] || {};
        e.jeque = r.jeque || 'Sin jeque asignado';
        e.director = r.director || 'Sin director deportivo';
      });

      const pilotoDelDia = ['Dani', 'Carlos'];
      state.carreras = t.gps.map((g, i) => {
        const disputada = g.disputada;
        const res = Object.entries(g.res).map(([slug, x]) => ({ slug, ...x }));
        const clasificados = res.filter(x => typeof x.pos === 'number').sort((a, b) => a.pos - b.pos);
        const nombre = (slug) => (t.pilotos[slug] || {}).nombre || slug;
        const detalle = clasificados.concat(res.filter(x => typeof x.pos !== 'number')).map(x => ({
          piloto: nombre(x.slug), escuderia: nombreEquipo((t.pilotos[x.slug] || {}).equipo),
          estadoPos: posTexto(x.pos), puntos: x.pts, nota: ''
        }));
        Object.keys(t.pilotos).filter(slug => disputada && !g.res[slug]).forEach(slug => detalle.push({
          piloto: nombre(slug), escuderia: nombreEquipo(t.pilotos[slug].equipo), estadoPos: 'No corrió', puntos: 0, nota: ''
        }));
        const esProx = prox && g.n === prox.n;
        return {
          orden: g.n, pais: g.pais, circuito: g.circuito,
          fecha: fechaCorta(g.fecha) ? `${fechaCorta(g.fecha)}${g.hora ? ' · ' + g.hora : ''}` : 'Fecha por confirmar',
          estado: disputada ? 'Disputada' : esProx ? 'Próxima' : 'Pendiente',
          podio: clasificados.slice(0, 3).map(x => nombre(x.slug)),
          vr: disputada ? 'No registrada' : '—',
          pilotoDia: disputada ? (pilotoDelDia[i] || '—') : 'Al terminar la carrera',
          votacionAbierta: false, miVotoPilotoDia: disputada ? (pilotoDelDia[i] || null) : null,
          actaEstado: disputada ? 'Acta cerrada por la FIA' : esProx ? `Convocatoria abierta · ${Object.keys(t.pilotos).length} pilotos` : 'Pendiente',
          resultadosDetalle: detalle,
          decisionesFia: []
        };
      });
      const ultima = t.gps.filter(g => g.disputada).pop();
      if (ultima) { state.ui.selectedCarreraOrden = ultima.n; state.ui.adminCarreraOrden = ultima.n; }

      state.palmares = [...LIGA.filter(x => x.tipo === 'individual'), temporadaAgregada(), ...splitsDelAno()].map(x => {
        const pil = clasificacionPilotos(x);
        const eqs = clasificacionEquipos(x);
        const conEquipo = (p) => p.equipo ? `${p.nombre} (${nombreEquipo(p.equipo)})` : p.nombre;
        return {
          split: x.nombre,
          campeonPiloto: x.enCurso ? `En juego · lidera ${conEquipo(pil[0])}` : conEquipo(pil[0]),
          campeonEscuderia: x.tipo === 'individual' ? (x.duos && x.duos[0] ? `Dúo ${x.duos[0].nombre}` : '—') : x.enCurso ? `En juego · lidera ${nombreEquipo(eqs[0].id)}` : nombreEquipo(eqs[0].id),
          subcampeon: pil[1] ? pil[1].nombre : '—',
          carreras: x.gps.length,
          rango: `GP ${x.gps[0].n}–${x.gps[x.gps.length - 1].n}`
        };
      });

      const lider = eqOrden[0], segundo = eqOrden[1];
      const lemas = {
        [lider.id]: `Líderes del ${t.nombre} con ${lider.pts - segundo.pts} puntos de ventaja tras ${t.gps.filter(g => g.disputada).length} carreras.`,
        [segundo.id]: `A ${lider.pts - segundo.pts} puntos del liderato. ${prox ? prox.circuito + ' es para recortar.' : ''}`,
        [eqOrden[2].id]: `Terceros con ${eqOrden[2].pts} puntos: quedan ${t.gps.filter(g => !g.disputada).length} carreras para remontar.`
      };
      state.equipos.forEach(e => { if (lemas[e.id]) e.lemaCartel = lemas[e.id]; });
      // Los avisos de bienvenida repiten el lema de cada escudería; el de la FIA, la próxima carrera.
      (state.avisos || []).forEach(a => {
        const eq = state.equipos.find(e => a.titulo && a.titulo.endsWith(e.nombre));
        if (eq) a.texto = eq.lemaCartel;
        if (prox && /^Aviso FIA · Horario de /.test(a.titulo || '')) a.titulo = `Aviso FIA · Horario de ${prox.circuito}`;
      });
    }
    aplicarLiga();

    // Al abrir la página se piden los datos en vivo; si falla la red, se queda la copia.
    state.ui.origenDatos = 'copia';
    if (typeof fetch === 'function' && window.cargarLiga) {
      cargarLiga(fetch).then(nueva => {
        if (!nueva.temporadas.some(t => t.enCurso)) throw new Error('no hay split en curso');
        LIGA.splice(0, LIGA.length, ...nueva.temporadas);
        Object.keys(RESPONSABLES).forEach(k => delete RESPONSABLES[k]);
        Object.assign(RESPONSABLES, nueva.responsables);
        completarResponsables();
        aplicarLiga();
        state.ui.origenDatos = 'vivo';
        renderApp();
      }).catch(err => console.warn('Datos en vivo no disponibles, uso la copia:', err.message));
    }

    function tituloPortada() {
      const ev = state.temporada.proximoEvento;
      return `${state.temporada.split.toUpperCase()} · RUMBO A ${ev.circuito.toUpperCase()}`;
    }

    function subtituloPortada() {
      const t = temporadaActual();
      const eqs = clasificacionEquipos(t);
      const pil = clasificacionPilotos(t);
      const jugadas = t.gps.filter(g => g.disputada).map(g => g.pais);
      return `${nombreEquipo(eqs[0].id)} lidera con ${eqs[0].pts} puntos, ${eqs[0].pts - eqs[1].pts} más que ${nombreEquipo(eqs[1].id)}, tras ${jugadas.length > 1 ? jugadas.slice(0, -1).join(', ') + ' y ' + jugadas[jugadas.length - 1] : jugadas[0]}. `
        + `En pilotos manda ${pil[0].nombre} con ${pil[0].pts}, seguido de ${pil[1].nombre} (${pil[1].pts}).`;
    }

    /* ==========================================================================
       GRÁFICO DE EVOLUCIÓN ALINEADO: el gráfico y la tabla comparten las mismas columnas,
       así cada punto queda justo encima de la cifra de su GP. En móvil se desliza entero.
       ========================================================================== */
    function escalaNice(min, max) {
      if (min === max) { max = min + 1; }
      const paso0 = (max - min) / 4;
      const mag = Math.pow(10, Math.floor(Math.log10(paso0)));
      const paso = [1, 2, 2.5, 5, 10].map(f => f * mag).find(s => s >= paso0);
      const lo = Math.floor(min / paso) * paso;
      const hi = Math.ceil(max / paso) * paso;
      const ticks = [];
      for (let v = lo; v <= hi + paso / 2; v += paso) ticks.push(+v.toFixed(6));
      return { lo, hi, ticks };
    }

    /**
     * cfg.columnas: [{ arriba, abajo, titulo, grupo, pendiente }]
     * cfg.series:   [{ id, nombre, color, dash, cabecera, valores: [num|null], celdas: [html] }]
     * cfg.filasExtra: [{ etiqueta, celdas: [html] }]
     */
    function renderEvolucion(cfg) {
      const n = cfg.columnas.length;
      const todos = cfg.series.flatMap(s => s.valores).filter(v => v != null);
      const esc = escalaNice(cfg.desdeCero ? 0 : Math.min(...todos), Math.max(...todos));
      const yPct = (v) => 6 + (1 - (v - esc.lo) / (esc.hi - esc.lo)) * 88;
      const xPct = (i) => ((i + 0.5) / n) * 100;
      const fmt = cfg.formato || (v => v);

      // Grupos (splits) para la banda superior y las líneas de corte.
      const grupos = [];
      cfg.columnas.forEach((c, i) => {
        const g = grupos[grupos.length - 1];
        if (g && g.nombre === c.grupo) g.fin = i; else grupos.push({ nombre: c.grupo, inicio: i, fin: i, sub: c.grupoSub });
      });
      const hayGrupos = grupos.length > 1 || (grupos[0] && grupos[0].nombre);

      const cortes = grupos.slice(1).map(g => `<span class="evo-corte" style="left:${(g.inicio / n) * 100}%"></span>`).join('');
      const pendientes = cfg.columnas.map((c, i) => c.pendiente
        ? `<span class="evo-pendiente" style="left:${(i / n) * 100}%;width:${100 / n}%"></span>` : '').join('');
      const rejilla = esc.ticks.map(v => `<span class="evo-rejilla" style="top:${yPct(v)}%"></span>`).join('');
      const ejeY = esc.ticks.map(v => `<span class="evo-tick" style="top:${yPct(v)}%">${cfg.formatoEje ? cfg.formatoEje(v) : v}</span>`).join('');

      // Una línea por tramo continuo: se corta en los huecos y en el paso de un split a otro.
      const lineas = cfg.series.map(s => {
        const tramos = [];
        let actual = [];
        s.valores.forEach((v, i) => {
          const cambiaGrupo = i > 0 && cfg.columnas[i].grupo !== cfg.columnas[i - 1].grupo && !cfg.unirGrupos;
          if (v == null || cambiaGrupo) { if (actual.length) tramos.push(actual); actual = []; }
          if (v != null) actual.push(`${i * 100 + 50},${yPct(v)}`);
        });
        if (actual.length) tramos.push(actual);
        return tramos.map(tr => tr.length > 1
          ? `<polyline points="${tr.join(' ')}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''}/>`
          : '').join('');
      }).join('');

      const puntos = cfg.series.map(s => s.valores.map((v, i) => v == null ? '' : `
        <span class="evo-punto ${s.marcas && s.marcas[i] ? 'evo-punto--' + s.marcas[i] : ''}" style="left:${xPct(i)}%;top:${yPct(v)}%;--c:${s.color}"></span>
      `).join('')).join('');

      // Zonas de lectura: al pasar por una columna se ve el valor de cada serie en ese GP.
      const zonas = cfg.columnas.map((c, i) => {
        const filas = cfg.series.map(s => s.valores[i] == null ? '' : `
          <span class="evo-tip-fila"><i style="--c:${s.color}"></i>${s.nombre}<b>${fmt(s.valores[i])}</b></span>`).join('');
        return `<span class="evo-zona" style="left:${(i / n) * 100}%;width:${100 / n}%" tabindex="0" aria-label="${c.titulo}">
          <span class="evo-tip ${i > n / 2 ? 'evo-tip--izq' : ''}"><strong>${c.titulo}</strong>${filas || '<span class="evo-tip-fila">Por disputar</span>'}</span>
        </span>`;
      }).join('');

      const celdaGrupo = hayGrupos ? `
        <div class="evo-sticky evo-grupo-vacio"></div>
        ${grupos.map(g => `<div class="evo-grupo" style="grid-column:${g.inicio + 2} / ${g.fin + 3}">${g.nombre || ''}${g.sub ? `<small>${g.sub}</small>` : ''}</div>`).join('')}
      ` : '';

      const cabeceras = cfg.columnas.map((c, i) => `
        <div class="evo-col ${c.pendiente ? 'is-pendiente' : ''} ${i > 0 && c.grupo !== cfg.columnas[i - 1].grupo ? 'is-corte' : ''}" title="${c.titulo}">
          <b>${c.arriba}</b><span>${c.abajo || ''}</span>
        </div>`).join('');

      const filaSerie = (s) => `
        <div class="evo-sticky evo-nombre">
          <svg class="evo-muestra" viewBox="0 0 22 8" aria-hidden="true"><line x1="1" y1="4" x2="21" y2="4" stroke="${s.color}" stroke-width="2" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''}/></svg>
          ${s.cabecera || s.nombre}
        </div>
        ${s.celdas.map((h, i) => `<div class="evo-celda ${cfg.columnas[i].pendiente ? 'is-pendiente' : ''} ${i > 0 && cfg.columnas[i].grupo !== cfg.columnas[i - 1].grupo ? 'is-corte' : ''}">${h}</div>`).join('')}
      `;
      const filaExtra = (f) => `
        <div class="evo-sticky evo-nombre evo-nombre--extra">${f.etiqueta}</div>
        ${f.celdas.map((h, i) => `<div class="evo-celda evo-celda--extra ${cfg.columnas[i].pendiente ? 'is-pendiente' : ''} ${i > 0 && cfg.columnas[i].grupo !== cfg.columnas[i - 1].grupo ? 'is-corte' : ''}">${h}</div>`).join('')}
      `;

      return `
        <figure class="evo" style="--evo-n:${n}">
          ${cfg.titulo ? `<figcaption class="evo-titulo">${cfg.titulo}</figcaption>` : ''}
          <div class="evo-scroll" data-ultimo="${cfg.columnas.map(c => !c.pendiente).lastIndexOf(true)}">
            <div class="evo-grid" role="table" aria-label="${cfg.aria || cfg.titulo || 'Evolución por GP'}">
              ${celdaGrupo}
              <div class="evo-sticky evo-eje" aria-hidden="true">${ejeY}</div>
              <div class="evo-plot" style="grid-column:2 / ${n + 2}">
                ${pendientes}${rejilla}${cortes}
                <svg viewBox="0 0 ${n * 100} 100" preserveAspectRatio="none" aria-hidden="true">${lineas}</svg>
                ${puntos}${zonas}
              </div>
              <div class="evo-sticky evo-nombre evo-nombre--cab">${cfg.cabeceraFilas || 'GP'}</div>
              ${cabeceras}
              ${cfg.series.map(filaSerie).join('')}
              ${(cfg.filasExtra || []).map(filaExtra).join('')}
            </div>
          </div>
          ${cfg.nota ? `<p class="evo-nota">${cfg.nota}</p>` : ''}
        </figure>
      `;
    }

    /** En móvil los gráficos largos abren desplazados hasta la última carrera disputada. */
    new MutationObserver(() => {
      document.querySelectorAll('.evo-scroll[data-ultimo]:not([data-colocado])').forEach(sc => {
        sc.dataset.colocado = '1';
        const col = sc.querySelectorAll('.evo-col')[Number(sc.dataset.ultimo)];
        if (!col) return;
        const fin = col.offsetLeft + col.offsetWidth + col.offsetWidth;
        if (fin > sc.clientWidth) sc.scrollLeft = fin - sc.clientWidth;
      });
    }).observe(document.documentElement, { childList: true, subtree: true });

    function colorSerie(id) { return `var(--serie-${id})`; }

    function columnasGp(temporadas) {
      return temporadas.flatMap(t => t.gps.map(g => ({
        arriba: g.n, abajo: codigoGp(g),
        titulo: `GP ${g.n} · ${g.pais} (${g.circuito})${g.disputada ? '' : ' · por disputar'}`,
        grupo: temporadas.length > 1 ? t.nombre : '', pendiente: !g.disputada
      })));
    }

    /** Puntos acumulados de cada escudería, GP a GP. alcance: 'split' o 'ano' (splits 1–3 seguidos). */
    function renderEvolucionEquipos(temporada, alcance) {
      if (temporada.agregada) alcance = 'ano';
      const temps = alcance === 'ano' && temporada.tipo === 'equipos' ? splitsDelAno() : [temporada];
      const columnas = columnasGp(temps);
      const series = ORDEN_SERIE.map(id => {
        let acum = 0;
        const valores = [], celdas = [];
        temps.forEach(t => {
          if (alcance !== 'ano') acum = 0;
          t.gps.forEach(g => {
            const pts = puntosEquipoEnGp(t, id, g);
            if (pts == null) { valores.push(null); celdas.push('<span class="evo-vacio">—</span>'); return; }
            acum += pts;
            valores.push(acum);
            celdas.push(`<strong>${acum}</strong><small>+${pts}</small>`);
          });
        });
        const eq = getEquipo(id);
        return {
          id, nombre: eq.nombre, color: colorSerie(id), dash: SERIE_EQUIPO[id].dash, valores, celdas,
          cabecera: `<span class="team-logo-mini">${logoEquipo(eq)}</span><span>${eq.nombre}</span>`
        };
      });
      return renderEvolucion({
        titulo: alcance === 'ano' ? 'Puntos acumulados en la Temporada 1 (Splits 1–3)' : `Puntos acumulados por GP · ${temporada.nombre}`,
        columnas, series, desdeCero: true, unirGrupos: alcance === 'ano',
        nota: alcance === 'ano'
          ? 'Cada línea suma los puntos de toda la temporada. Las rayas verticales marcan el paso de un split a otro: ahí cambian las plantillas.'
          : 'En cada GP: arriba el acumulado, abajo lo sumado en esa carrera. Las columnas sombreadas están por disputar.'
      });
    }

    /** Puntos de cada piloto por GP (solo tabla alineada, sin líneas: once pilotos no caben en un gráfico legible). */
    /** Marcas de Origins (1 = se cumple): pole, vuelta rápida, piloto del día y racha. */
    function marcasOrigins(r) {
      if (!r.det) return '';
      const m = [r.det.pole && 'PO', r.det.vr && 'VR', r.det.pdd && 'PD', r.det.racha && 'R'].filter(Boolean);
      return m.length ? `<small class="evo-marcas">${m.join(' ')}</small>` : '';
    }
    function detalleOrigins(r, g) {
      const d = r.det;
      const extra = `extra ${d.extra}: ${d.limpio ? 'sin sanción +2' : 'sancionado +0'}, ${d.terminar ? 'terminó +1' : 'no terminó +0'}`
        + (d.pole ? ', pole +2' : '') + (d.vr ? ', vuelta rápida +1' : '') + (d.pdd ? ', piloto del día +2' : '') + (d.racha ? ', racha +5' : '');
      return `${posTexto(d.pos)} · estándar ${d.std}${g.doble ? ' ×2' : ''} · ${extra}${d.riv ? ` · rivalidad +${d.riv} (solo dúo)` : ''}`;
    }

    function renderPuntosPilotosPorGp(temporada, filtroEquipo) {
      const columnas = columnasGp([temporada]);
      const pilotos = clasificacionPilotos(temporada).filter(p => filtroEquipo === 'todas' || p.equipo === filtroEquipo);
      const filas = pilotos.map(p => `
        <div class="evo-sticky evo-nombre">${renderPilotTrigger(state.pilotos.find(x => x.slug === p.slug) || p.nombre)}</div>
        ${temporada.gps.map((g, i) => {
          const r = g.res[p.slug];
          const txt = !g.disputada ? '' : !r ? '<span class="evo-vacio" title="No corrió">NC</span>'
            : `<strong>${r.pts}</strong><small>${r.pos === 'DNF' ? 'DNF' : r.pos === '?' ? '¿?' : 'P' + r.pos}</small>${marcasOrigins(r)}`;
          return `<div class="evo-celda ${g.disputada ? '' : 'is-pendiente'}" ${r && r.det ? `title="${detalleOrigins(r, g)}"` : ''}>${txt}</div>`;
        }).join('')}
        <div class="evo-celda evo-celda--total"><strong>${p.pts}</strong></div>
      `).join('');
      return `
        <figure class="evo" style="--evo-n:${columnas.length + 1}">
          <figcaption class="evo-titulo">Puntos por GP · ${temporada.nombre}</figcaption>
          <div class="evo-scroll">
            <div class="evo-grid evo-grid--tabla" role="table" aria-label="Puntos por GP de cada piloto">
              <div class="evo-sticky evo-nombre evo-nombre--cab">Piloto</div>
              ${columnas.map(c => `<div class="evo-col ${c.pendiente ? 'is-pendiente' : ''}" title="${c.titulo}"><b>${c.arriba}</b><span>${c.abajo}</span></div>`).join('')}
              <div class="evo-col evo-col--total"><b>Total</b><span>pts</span></div>
              ${filas}
            </div>
          </div>
          <p class="evo-nota">${temporada.tipo === 'individual'
            ? 'Arriba los puntos de la carrera y abajo el puesto. El puesto sale de los puntos estándar, que son los de la carrera menos los extra (12 = P1, 10 = P2, 9 = P3… 2 = P10; con 1 punto acabó entre el 11.º y el 20.º, y el Excel no guarda el puesto exacto). Marcas: PO pole, VR vuelta rápida, PD piloto del día, R racha de 3 sin DNF; cada una vale 1 si se cumple y 0 si no. En Canadá los puntos estándar cuentan doble.'
            : 'Arriba los puntos de esa carrera y abajo el puesto. NC: no corrió. Las columnas sombreadas están por disputar.'}</p>
        </figure>
      `;
    }

    /** Saldo de una o varias escuderías en el split en curso, GP a GP. */
    function renderEvolucionSaldo(equipos, opciones = {}) {
      const base = equipos[0].historialCircuitos;
      const t = temporadaActual();
      const columnas = base.map(h => h.clave === 'salida'
        ? { arriba: 'Salida', abajo: LIGA[LIGA.indexOf(t) - 1].nombre, titulo: h.gp, grupo: '' }
        : h.clave === 'mercado'
          ? { arriba: 'Mercado', abajo: 'pre-GP', titulo: h.gp, grupo: '' }
          : { arriba: h.orden, abajo: h.codigo || '', titulo: h.gp + (h.pendiente ? ' · por disputar' : ''), grupo: '', pendiente: h.pendiente });
      const series = equipos.map(eq => ({
        id: eq.id, nombre: eq.nombre, color: colorSerie(eq.id), dash: SERIE_EQUIPO[eq.id].dash,
        valores: eq.historialCircuitos.map(h => h.saldo),
        marcas: eq.historialCircuitos.map(h => h.hito ? (h.hito.tipo === 'venta' ? 'entrada' : 'salida') : null),
        celdas: eq.historialCircuitos.map(h => h.pendiente ? '' : h.saldo == null
          ? '<span class="evo-vacio">sin saldo registrado</span>'
          : `<strong>${h.saldo.toFixed(1).replace('.', ',')}</strong>${h.delta != null ? `<small class="${h.delta < 0 ? 'is-neg' : 'is-pos'}">${fmtDelta(h.delta)}</small>` : '<small>real</small>'}`),
        cabecera: `<span class="team-logo-mini">${logoEquipo(eq)}</span><span>${eq.nombre}</span>`
      }));
      const filasExtra = equipos.length === 1 ? [{
        etiqueta: 'Mercado',
        celdas: equipos[0].historialCircuitos.map(h => h.hito
          ? `<span class="evo-hito evo-hito--${h.hito.tipo === 'venta' ? 'entrada' : 'salida'}">${h.hito.tipo === 'venta' ? '▲' : '▼'}</span><small>${h.hito.etiqueta}</small>` : '')
      }] : [];
      return renderEvolucion({
        titulo: opciones.titulo || `Saldo tras cada GP · ${t.nombre} (M€)`,
        columnas, series, filasExtra, cabeceraFilas: 'M€',
        formato: fmtM, formatoEje: v => v.toFixed(0),
        nota: opciones.nota || `La salida es el saldo con el que se cerró el ${LIGA[LIGA.indexOf(t) - 1].nombre}. ▲ entra dinero por ventas, ▼ sale por fichajes y cláusulas. Lo de cada GP sale de sus resultados con las reglas de la liga; el mercado es el resto hasta el saldo actual.`
      });
    }

    /** Saldo de cada escudería al empezar y cerrar cada split: así se ve cómo pasa el dinero de un split al siguiente. */
    function renderSaldoEntreSplits(equipoIds) {
      const splits = splitsDelAno();
      const columnas = [{ arriba: 'Inicio', abajo: splits[0].nombre, titulo: `Saldo inicial del ${splits[0].nombre}`, grupo: '' }]
        .concat(splits.map(s => ({
          arriba: s.enCurso ? 'Ahora' : 'Cierre', abajo: s.nombre,
          titulo: s.enCurso ? `Saldo actual en el ${s.nombre}` : `Cierre del ${s.nombre} = salida del siguiente`, grupo: ''
        })));
      const series = equipoIds.map(id => {
        const valores = [splits[0].equipos.find(e => e.id === id).saldoInicial]
          .concat(splits.map(s => { const e = s.equipos.find(x => x.id === id); return s.enCurso ? e.saldoActual : e.saldoCierre; }));
        const eq = getEquipo(id);
        return {
          id, nombre: eq.nombre, color: colorSerie(id), dash: SERIE_EQUIPO[id].dash, valores,
          celdas: valores.map((v, i) => `<strong>${v.toFixed(1).replace('.', ',')}</strong>${i ? `<small class="${v - valores[i - 1] < 0 ? 'is-neg' : 'is-pos'}">${fmtDelta(v - valores[i - 1])}</small>` : '<small>salida</small>'}`),
          cabecera: `<span class="team-logo-mini">${logoEquipo(eq)}</span><span>${eq.nombre}</span>`
        };
      });
      return renderEvolucion({
        titulo: 'Saldo de split en split · Temporada 1 (M€)',
        columnas, series, cabeceraFilas: 'M€', unirGrupos: true,
        formato: fmtM, formatoEje: v => v.toFixed(0),
        nota: 'Cifras reales. El saldo con el que cierra un split es el saldo de salida del siguiente.'
      });
    }

    /** Selector de temporadas enlazadas: Origins y luego los tres splits de 2026 en fila. */
    function renderTemporadasRail(seleccion, accion) {
      const nodo = (t) => {
        const pal = state.palmares.find(p => p.split === t.nombre) || { campeonEscuderia: '' };
        const meta = t.agregada ? `Total · GP ${t.gps[0].n}–${t.gps[t.gps.length - 1].n}${t.enCurso ? ' · en curso' : ''}`
          : t.enCurso ? `GP ${t.gps[0].n}–${t.gps[t.gps.length - 1].n} · en curso`
          : `${t.tipo === 'individual' ? `${t.gps.length} GP` : `GP ${t.gps[0].n}–${t.gps[t.gps.length - 1].n}`} · ${pal.campeonEscuderia.replace(/^Dúo /, '')}`;
        return `
          <button type="button" class="season-node ${t.agregada ? 'season-node--total' : ''} ${t.nombre === seleccion ? 'is-active' : ''} ${t.enCurso && !t.agregada ? 'is-live' : ''}"
            aria-pressed="${t.nombre === seleccion}" onclick="${accion}('${t.nombre}')">
            <span class="season-dot" aria-hidden="true"></span>
            <span class="season-name">${t.nombre}</span>
            <span class="season-meta">${meta}</span>
          </button>`;
      };
      const individuales = LIGA.filter(t => t.tipo === 'individual');
      return `
        <nav class="season-rail" aria-label="Temporadas">
          ${individuales.map(t => `
            <div class="season-group">
              <span class="season-group-label">Temporada ${t.nombre} · por dúos</span>
              <div class="season-track">${nodo(t)}</div>
            </div>`).join('')}
          <div class="season-group season-group--ano">
            <span class="season-group-label">Temporada 1 · por escuderías</span>
            <div class="season-track season-track--linked">${nodo(temporadaAgregada())}${splitsDelAno().map(nodo).join('')}</div>
          </div>
        </nav>
      `;
    }

    /** Tabla de dúos de un mundial individual (Origins): puntos de cada dúo GP a GP. */
    function renderDuos(t) {
      const lider = t.duos[0] ? t.duos[0].pts : 0;
      const piloto = (slug) => state.pilotos.find(x => x.slug === slug) || { slug, nombre: (t.pilotos[slug] || {}).nombre || slug, equipoId: null };
      const columnas = columnasGp([t]);
      return `
        <div class="clean-table-panel">
          <table class="standings-table" aria-label="Clasificación de dúos">
            <thead><tr><th style="width:64px;">POS</th><th>DÚO</th><th class="hide-on-mobile col-right">DIF.</th><th class="col-right">PTS</th></tr></thead>
            <tbody>
              ${t.duos.map((d, i) => `
                <tr>
                  <td><span class="pos-cell"><span class="${i < 3 ? 'pos-podium' : ''}">${i + 1}</span></span></td>
                  <td>
                    <span class="duo-cell">${d.pilotos.map(s => `<span class="driver-avatar">${avatarPiloto(piloto(s))}</span>`).join('')}<strong>${d.nombre}</strong></span>
                    <span class="mobile-sub-team">${d.pilotos.map(s => `${piloto(s).nombre} ${(t.pilotos[s] || {}).pts ?? 0}`).join(' · ')}${i ? ` · −${lider - d.pts}` : ''}</span>
                  </td>
                  <td class="hide-on-mobile col-right"><span class="gap-pill">${i ? `−${lider - d.pts}` : '—'}</span></td>
                  <td class="col-right"><span class="pts-strong">${d.pts}</span></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <figure class="evo" style="--evo-n:${columnas.length + 1}">
          <figcaption class="evo-titulo">Puntos de cada dúo por GP · ${t.nombre}</figcaption>
          <div class="evo-scroll">
            <div class="evo-grid evo-grid--tabla" role="table" aria-label="Puntos por GP de cada dúo">
              <div class="evo-sticky evo-nombre evo-nombre--cab">Dúo</div>
              ${columnas.map(c => `<div class="evo-col" title="${c.titulo}"><b>${c.arriba}</b><span>${c.abajo}</span></div>`).join('')}
              <div class="evo-col evo-col--total"><b>Total</b><span>pts</span></div>
              ${t.duos.map(d => `
                <div class="evo-sticky evo-nombre"><span>${d.nombre}</span></div>
                ${t.gps.map((g, i) => `<div class="evo-celda"><strong>${d.porGp[i] ?? '—'}</strong></div>`).join('')}
                <div class="evo-celda evo-celda--total"><strong>${d.pts}</strong></div>
              `).join('')}
            </div>
          </div>
          <p class="evo-nota">Los puntos del dúo son los de sus dos pilotos más los de rivalidad (1 por ganar la de clasificación y 3 por la de carrera), como en el Excel de Origins.</p>
        </figure>
      `;
    }

    function renderPalmaresTabla() {
      return `
        <div class="clean-table-panel">
          <table class="standings-table" aria-label="Palmarés por temporada">
            <thead>
              <tr><th>TEMPORADA</th><th>CAMPEÓN PILOTOS</th><th>CAMPEÓN ESCUDERÍAS</th><th class="col-right">CARRERAS</th></tr>
            </thead>
            <tbody>
              ${state.palmares.map(item => `
                <tr class="row-link ${/^Split /.test(item.split) ? 'palmares-split' : ''}" tabindex="0" onclick="verTemporada('${item.split}')" onkeydown="if(event.key==='Enter')verTemporada('${item.split}')">
                  <td><strong>${item.split}</strong><span class="mobile-sub-team">${item.rango}</span></td>
                  <td>${item.campeonPiloto}</td>
                  <td>${item.campeonEscuderia}</td>
                  <td class="col-right">${item.carreras} GP<span class="mobile-sub-team">${item.rango}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <p class="evo-nota">Toca una temporada para ver su clasificación y su evolución.</p>
      `;
    }

    /** Lleva a la clasificación de esa temporada desde el palmarés o la trayectoria. */
    window.verTemporada = function(nombre) {
      state.ui.seasonFilter = nombre;
      state.ui.standingsMode = 'escuderias';
      state.ui.campeonatoTab = 'clasificacion';
      if (state.ui.role === 'invitado') {
        state.ui.portadaTab = 'clasificacion';
        location.hash = '#portada?tab=clasificacion';
      } else {
        location.hash = '#campeonato';
      }
      renderApp();
    };

    window.setEvoAlcance = function(a) {
      state.ui.evoAlcance = a;
      renderApp();
    };

    window.setSaldoVista = function(v) {
      state.ui.saldoVista = v;
      renderApp();
    };

    /** Evolución de un piloto en toda la Temporada 1: un grupo por split con su escudería de entonces. */
    function renderEvolucionPiloto(p) {
      const temps = splitsDelAno().filter(t => t.pilotos[p.slug]);
      const columnas = temps.flatMap(t => t.gps.map(g => ({
        arriba: g.n, abajo: codigoGp(g), titulo: `GP ${g.n} · ${g.pais}${g.disputada ? '' : ' · por disputar'}`,
        grupo: t.nombre, grupoSub: nombreEquipo(t.pilotos[p.slug].equipo), pendiente: !g.disputada
      })));
      let acum = 0;
      const valores = [], celdas = [], puestos = [];
      temps.forEach(t => t.gps.forEach(g => {
        const r = g.res[p.slug];
        if (!g.disputada) { valores.push(null); celdas.push(''); puestos.push(''); return; }
        acum += r ? r.pts : 0;
        valores.push(acum);
        celdas.push(`<strong>${acum}</strong><small>+${r ? r.pts : 0}</small>`);
        puestos.push(!r ? '<span class="evo-vacio">NC</span>' : r.pos === 'DNF' ? 'DNF' : r.pos === '?' ? '¿?' : `P${r.pos}`);
      }));
      const eq = getEquipo(p.equipoId);
      return renderEvolucion({
        titulo: `${p.nombre} · puntos acumulados en la Temporada 1`,
        columnas, unirGrupos: true, desdeCero: true,
        series: [{ id: p.slug, nombre: p.nombre, color: colorSerie(eq.id), dash: '', valores, celdas, cabecera: 'Acumulado' }],
        filasExtra: [{ etiqueta: 'Puesto', celdas: puestos }],
        nota: 'Cada bloque es un split, con la escudería en la que corrió. NC: no corrió.'
      });
    }

