    /* ==========================================================================
       ADMIN · ECONOMÍA Y FICHAJES y RIVALIDADES: la misma mecánica que el panel real
       (split, resumen por fuente, pilotos y mercado por circuito, acciones por piloto),
       con los datos públicos de la liga.
       ========================================================================== */
    // Mercado y ajuste de cláusulas salen del libro de movimientos, que exige sesión: copia del panel del 22 oct.
    // Los ingresos por carrera se calculan en vivo con los resultados y las reglas (coinciden con el panel).
    const LIBRO_SPLIT_ACTUAL = {
      alfa: { mercado: -28.9, ajusteClausulas: -63.7 }, roses: { mercado: 9.1, ajusteClausulas: null }, zenith: { mercado: -70.0, ajusteClausulas: null }
    };


    window.verDesgloseCircuito = function(n) {
      const t = splitAdmin('adminEcoSplit');
      const g = t.gps.find(x => x.n === n);
      const lineas = desgloseCircuito(t, g);
      const pendiente = !g.economiaProcesada;
      const anteriorSinProcesar = t.gps.find(x => x.n < n && x.disputada && !x.economiaProcesada);
      const tabla = Object.entries(lineas).map(([eq, ls]) => `
        <div class="desglose-equipo">
          <div class="desglose-cab"><span class="team-cell-inline"><span class="team-logo-mini">${logoEquipo(getEquipo(eq))}</span>${nombreEquipo(eq)}</span>
            <strong>+${fmtNum(ls.reduce((s, l) => s + l.importe, 0))} M€</strong></div>
          <ul>${ls.map(l => `<li><span>${NOMBRE_FUENTE[l.fuente]} · ${l.texto}</span><b>+${fmtNum(l.importe)}</b></li>`).join('')}</ul>
        </div>`).join('');
      openMoneyConfirmModal({
        titulo: `${pendiente ? 'Procesar economía' : 'Economía'} · GP ${g.n} ${g.pais} (${g.circuito})`,
        resumen: pendiente
          ? (anteriorSinProcesar ? `Antes hay que procesar el GP ${anteriorSinProcesar.n}: las carreras se procesan en orden.` : 'Se sumará a cada escudería lo siguiente y se recalcularán mantener y cláusula de cada piloto para este circuito.')
          : 'Ya procesada. Esto es lo que sumó a cada escudería.',
        detalleExtra: `<div class="desglose">${tabla}</div>`,
        onConfirm: () => {
          if (pendiente && !anteriorSinProcesar) { g.economiaProcesada = true; showToast(`GP ${g.n} procesado (prototipo: no se guarda).`); renderApp(); }
        }
      });
      // Solo consulta: sin botón de confirmar.
      if (!pendiente || anteriorSinProcesar) {
        const ok = document.getElementById('confirmActionSubmitBtn');
        if (ok) ok.hidden = true;
      }
    };
    const FUENTES_RESUMEN = [
      ['puntos', 'Puntos'], ['pole', 'Pole'], ['vr', 'Vuelta rápida'], ['participacion', 'Participación'],
      ['limpias', 'Sin sanciones'], ['rivalidad', 'Rivalidad'], ['premio', 'Premio de temporada']
    ];
    const fmtNum = (n) => n == null ? '—' : `${n < 0 ? '−' : ''}${Math.abs(n).toFixed(1).replace('.', ',')}`;
    const claseNum = (n) => n == null ? 'is-vacio' : n < 0 ? 'is-neg' : 'is-pos';

    function splitAdmin(clave) {
      const splits = splitsDelAno();
      return splits.find(s => s.nombre === state.ui[clave]) || temporadaActual();
    }

    function renderSelectorSplit(clave, accion) {
      const actual = splitAdmin(clave);
      return `
        <div class="seg" role="group" aria-label="Split">
          ${splitsDelAno().map(s => `
            <button type="button" class="seg-btn" aria-pressed="${s === actual}" onclick="${accion}('${s.nombre}')">
              ${s.nombre}${s.enCurso ? '<span class="seg-live" aria-label="en curso"></span>' : ''}
            </button>`).join('')}
        </div>`;
    }

    window.setAdminEcoSplit = function(n) { state.ui.adminEcoSplit = n; renderApp(); };
    window.setAdminRivSplit = function(n) { state.ui.adminRivSplit = n; state.ui.rivSeleccion = []; renderApp(); };
    window.setAdminMercadoVista = function(v) { state.ui.adminMercadoVista = v; renderApp(); };

    function renderAdminEconomiaSection() {
      const t = splitAdmin('adminEcoSplit');
      const vista = state.ui.adminMercadoVista || 'precios';
      const ingresos = t.enCurso ? ingresosSplit(t) : {};
      const filas = clasificacionEquipos(t).map(r => {
        const eq = getEquipo(r.id);
        const d = t.enCurso ? { ...(LIBRO_SPLIT_ACTUAL[r.id] || {}), ...(ingresos[r.id] || {}) } : (r.desglose || {});
        const total = t.enCurso ? r.saldoActual : r.saldoCierre;
        return { r, eq, d, total };
      });

      const resumen = `
        <div class="admin-scroll">
          <table class="admin-table admin-table--resumen" aria-label="Resumen de escuderías">
            <thead>
              <tr>
                <th class="sticky-col">Escudería</th><th>Inicial</th><th>Mercado</th><th>Ajuste cláusulas</th>
                ${FUENTES_RESUMEN.map(([, n]) => `<th>+ ${n}</th>`).join('')}
                <th>${t.enCurso ? 'Total disp.' : 'Cierre'}</th><th>Pts</th>
              </tr>
            </thead>
            <tbody>
              ${filas.map(({ r, eq, d, total }) => `
                <tr>
                  <th class="sticky-col" scope="row"><span class="team-cell-inline"><span class="team-logo-mini">${logoEquipo(eq)}</span>${eq.nombre}</span></th>
                  <td><button type="button" class="link-btn" onclick="showToast('En la web real, aquí se fija el presupuesto inicial.')">${fmtNum(r.saldoInicial)}</button></td>
                  <td class="${claseNum(d.mercado)}">${fmtNum(d.mercado)}</td>
                  <td class="${claseNum(d.ajusteClausulas)}">${fmtNum(d.ajusteClausulas)}</td>
                  ${FUENTES_RESUMEN.map(([k]) => `<td class="${claseNum(d[k])}">${d[k] ? (d[k] > 0 ? '+' : '') + fmtNum(d[k]) : '—'}</td>`).join('')}
                  <td><strong>${fmtNum(total)}</strong>${t.enCurso ? `<button type="button" class="link-btn link-btn--block" onclick="ajustarSaldoEscuderiaModal('${eq.id}')">Ajustar saldo</button>` : ''}</td>
                  <td>${r.pts}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <p class="evo-nota">Importes en M€. ${t.enCurso
          ? 'Inicial, total, puntos y los ingresos por fuente salen en vivo: se calculan con los resultados de cada carrera y las reglas de la liga. Mercado y ajuste de cláusulas son una copia del panel del 22 oct, porque el libro de movimientos exige sesión.'
          : 'Cierre conciliado del split, tal como está guardado en la liga.'}</p>`;

      // Pilotos y mercado: una fila por piloto, una columna por circuito.
      const columnas = t.gps;
      const celdaGp = (p, g) => {
        if (vista === 'rendimiento') {
          const r = g.res[p.slug];
          if (!g.disputada) return '<td class="is-vacio">—</td>';
          return r ? `<td><strong>${r.pts}</strong><small>${typeof r.pos === 'number' ? 'P' + r.pos : r.pos === 'DNF' ? 'DNF' : '¿?'}</small></td>` : '<td class="is-vacio">NC</td>';
        }
        const h = (p.historial || {})[g.id];
        return h ? `<td><span class="${h.m < 0 ? 'is-neg' : ''}">${fmtNum(h.m)}</span><small class="${h.c < 0 ? 'is-neg' : ''}">${fmtNum(h.c)}</small></td>` : '<td class="is-vacio">—</td>';
      };
      const grupos = clasificacionEquipos(t).map(r => ({
        eq: getEquipo(r.id),
        pilotos: r.pilotos.map(slug => ({ slug, ...t.pilotos[slug] })).filter(p => p.nombre)
      }));
      const accionesPiloto = (p, eq) => t.enCurso ? `
        <div class="acciones-piloto">
          <button type="button" class="chip-accion chip-accion--fuerte" onclick="adminPactarPiloto('${p.slug}')">Pactar próximo split</button>
          <button type="button" class="chip-accion" onclick="adminAccionPiloto('liberar','${p.slug}')">Liberar</button>
          <button type="button" class="chip-accion" onclick="adminAccionPiloto('deshacer','${p.slug}')">Deshacer alta</button>
          <button type="button" class="chip-accion" onclick="adminAccionPiloto('clausula','${p.slug}')">Ajustar cláusula</button>
        </div>` : '';
      const mercado = `
        <div class="admin-scroll">
          <table class="admin-table admin-table--mercado" aria-label="Pilotos y mercado de ${t.nombre}">
            <thead>
              <tr>
                <th class="sticky-col">Piloto</th><th>Precio</th><th>Próx. split</th>
                ${columnas.map(g => `
                  <th class="${g.disputada ? '' : 'is-pendiente'}">
                    <span class="th-gp">${g.n} · ${codigoGp(g)}</span>
                    <span class="th-sub">${g.circuito}</span>
                    ${g.disputada ? `<button type="button" class="estado-eco ${g.economiaProcesada ? 'is-ok' : ''}" onclick="verDesgloseCircuito(${g.n})">${g.economiaProcesada ? 'Procesada · ver desglose' : 'Procesar economía'}</button>` : ''}
                  </th>`).join('')}
                <th>${vista === 'precios' ? 'Actual' : 'Total'}</th>
              </tr>
              <tr class="th-leyenda"><th class="sticky-col"></th><th>compra</th><th></th>${columnas.map(() => `<th>${vista === 'precios' ? 'mant. / cláus.' : 'pts / pos.'}</th>`).join('')}<th>${vista === 'precios' ? 'mant. / cláus.' : 'pts'}</th></tr>
            </thead>
            <tbody>
              ${grupos.map(({ eq, pilotos }) => `
                <tr class="fila-equipo"><th class="sticky-col" colspan="1"><span class="team-cell-inline"><span class="team-logo-mini">${logoEquipo(eq)}</span>${eq.nombre}</span></th><td colspan="${columnas.length + 3}"></td></tr>
                ${pilotos.map(p => `
                  <tr>
                    <th class="sticky-col" scope="row">
                      ${renderPilotTrigger(state.pilotos.find(x => x.slug === p.slug) || p.nombre)}
                      ${accionesPiloto(p, eq)}
                    </th>
                    <td class="${p.compra < 0 ? 'is-neg' : ''}"><button type="button" class="link-btn" onclick="adminAccionPiloto('precio','${p.slug}')">${fmtNum(p.compra)}</button><small>${({ fichaje: 'Fichaje', clausula: 'Cláusula', mantener: 'Renovado', subasta: 'Subasta' })[p.tipo] || ''}</small></td>
                    <td class="${p.proxEquipo ? '' : 'is-vacio'}">${p.proxEquipo ? nombreEquipo(p.proxEquipo) : 'Sin pacto'}</td>
                    ${columnas.map(g => celdaGp(p, g)).join('')}
                    <td class="col-actual">${vista === 'precios'
                      ? `<strong class="${p.mantener < 0 ? 'is-neg' : ''}">${fmtNum(p.mantener)}</strong><small class="${p.clausula < 0 ? 'is-neg' : ''}">${fmtNum(p.clausula)}</small>`
                      : `<strong>${p.pts}</strong>`}</td>
                  </tr>`).join('')}
              `).join('')}
            </tbody>
          </table>
        </div>`;

      return `
        <section class="section-card admin-eco">
          <p class="admin-intro">Gestiona los traspasos, contratos y presupuestos de cada split.</p>
          <details class="admin-reglas">
            <summary>Reglas económicas del split</summary>
            <p>Participación, puntos, pole, vuelta rápida, carrera sin sanciones y rivalidad suman al saldo de la escudería en cada carrera procesada. Mantener y cláusula de cada piloto se recalculan por circuito.</p>
          </details>
          <div class="admin-toolbar">
            ${renderSelectorSplit('adminEcoSplit', 'setAdminEcoSplit')}
            <div class="admin-toolbar-acciones">
              ${t.enCurso ? `<button type="button" class="btn btn-secondary" onclick="state.ui.adminAltaAbierta=!state.ui.adminAltaAbierta;renderApp();">+ Añadir piloto</button>` : ''}
              <button type="button" class="btn btn-secondary" onclick="showToast('En la web real, aquí se descarga el boletín FIA en PDF.')">Boletín FIA (PDF)</button>
            </div>
          </div>
          ${state.ui.adminAltaAbierta && t.enCurso ? `
            <form class="admin-alta" onsubmit="event.preventDefault();showToast('Prototipo: el alta no se guarda.');state.ui.adminAltaAbierta=false;renderApp();">
              <div class="form-field"><label for="altaNombre">Piloto</label><input id="altaNombre" class="form-input" required placeholder="Nombre"></div>
              <div class="form-field"><label for="altaEquipo">Escudería</label><select id="altaEquipo" class="form-input">${ORDEN_SERIE.map(id => `<option value="${id}">${getEquipo(id).nombre}</option>`).join('')}<option value="agente_libre">Agentes libres</option></select></div>
              <div class="form-field"><label for="altaPrecio">Precio (M€)</label><input id="altaPrecio" class="form-input" type="number" step="0.1" required></div>
              <button type="submit" class="btn btn-primary">Fichar en este split</button>
            </form>` : ''}

          <h2 class="admin-subtitulo">Resumen de escuderías · ${t.nombre}</h2>
          ${resumen}

          ${t.enCurso ? `
            <h2 class="admin-subtitulo">Saldo tras cada GP</h2>
            ${renderEvolucionSaldo(ORDEN_SERIE.map(getEquipo), { titulo: 'Saldo de las tres escuderías tras cada GP (M€)' })}
          ` : `
            <h2 class="admin-subtitulo">Saldo de split en split</h2>
            ${renderSaldoEntreSplits(ORDEN_SERIE)}
          `}

          <div class="admin-subtitulo-fila">
            <h2 class="admin-subtitulo">Pilotos y mercado</h2>
            <div class="seg" role="group" aria-label="Vista de la tabla">
              <button type="button" class="seg-btn" aria-pressed="${vista === 'precios'}" onclick="setAdminMercadoVista('precios')">Precios</button>
              <button type="button" class="seg-btn" aria-pressed="${vista === 'rendimiento'}" onclick="setAdminMercadoVista('rendimiento')">Rendimiento</button>
            </div>
          </div>
          ${mercado}
          <p class="evo-nota">${vista === 'precios'
            ? 'En cada circuito, arriba el precio de mantener y abajo la cláusula, en M€. Toca el precio de compra para corregirlo.'
            : 'En cada circuito, los puntos y el puesto del piloto. NC: no corrió.'}</p>
        </section>`;
    }

    window.adminPactarPiloto = function(slug) {
      const t = temporadaActual();
      const p = t.pilotos[slug];
      const equipos = ORDEN_SERIE.map(getEquipo);
      window.__pactoDestino = p.equipo;
      openMoneyConfirmModal({
        titulo: `Pactar a ${p.nombre} para el próximo split`,
        resumen: `${p.nombre} sigue corriendo con ${nombreEquipo(p.equipo)} hasta el final del ${t.nombre} y pasa al equipo elegido en el siguiente. El importe se cobra ahora.`,
        detalleExtra: `
          <span class="form-field"><label for="pactoEquipo">Escudería de destino</label>
            <select id="pactoEquipo" class="form-input" onchange="window.__pactoDestino=this.value">${equipos.map(e => `<option value="${e.id}" ${e.id === p.equipo ? 'selected' : ''}>${e.nombre}</option>`).join('')}</select></span>
          <span class="form-field"><label for="pactoPrecio">Precio (M€)</label><input id="pactoPrecio" class="form-input" type="number" step="0.1" value="${p.mantener ?? ''}"></span>
          Si el split siguiente aún no existe, se creará vacío, como en la web real.`,
        onConfirm: () => {
          p.proxEquipo = window.__pactoDestino || p.equipo;
          showToast(`Pacto de ${p.nombre} con ${nombreEquipo(p.proxEquipo)} (prototipo: no se guarda).`);
          renderApp();
        }
      });
    };

    window.adminAccionPiloto = function(accion, slug) {
      const p = temporadaActual().pilotos[slug];
      const textos = {
        liberar: `Liberar a ${p.nombre}: pasa a agentes libres en este split.`,
        deshacer: `Deshacer el alta de ${p.nombre}: se devuelve el importe a ${nombreEquipo(p.equipo)}.`,
        clausula: `Ajustar la cláusula de ${p.nombre} (ahora ${fmtNum(p.clausula)} M€).`,
        precio: `Corregir el precio de compra de ${p.nombre} (ahora ${fmtNum(p.compra)} M€).`
      };
      openMoneyConfirmModal({
        titulo: 'Confirmar operación', resumen: textos[accion],
        detalleExtra: 'En el prototipo no se guarda nada; en la web real esta acción queda en el libro y se puede deshacer.',
        onConfirm: () => showToast('Prototipo: operación simulada.')
      });
    };

    /* ----- Rivalidades: elegir pilotos de un toque ----- */
    function renderAdminRivalidadesSection() {
      const t = splitAdmin('adminRivSplit');
      const sel = state.ui.rivSeleccion || [];
      const grupos = t.rivalidades || [];
      const enGrupo = {};
      grupos.forEach(g => g.pilotos.forEach(s => { enGrupo[s] = g; }));
      const piloto = (slug) => state.pilotos.find(x => x.slug === slug) || { slug, nombre: (t.pilotos[slug] || {}).nombre || slug, equipoId: (t.pilotos[slug] || {}).equipo };
      const nombre = (slug) => (t.pilotos[slug] || {}).nombre || slug;
      const ovr = (slug) => (t.pilotos[slug] || {}).ovr;
      const sinRival = Object.keys(t.pilotos).filter(s => !enGrupo[s]);
      const valido = sel.length >= 2 && sel.length <= 3;

      return `
        <section class="section-card admin-riv">
          <p class="admin-intro">Define los grupos de pilotos que compiten por los premios de rivalidad: parejas o tríos, solo para el split elegido.</p>
          <div class="admin-toolbar">${renderSelectorSplit('adminRivSplit', 'setAdminRivSplit')}</div>

          <h2 class="admin-subtitulo">Nuevo grupo</h2>
          <div class="riv-equipos">
            ${clasificacionEquipos(t).map(r => `
              <div class="riv-equipo">
                <span class="riv-equipo-nombre"><span class="team-logo-mini">${logoEquipo(getEquipo(r.id))}</span>${nombreEquipo(r.id)}</span>
                <div class="riv-chips">
                  ${r.pilotos.filter(s => t.pilotos[s]).map(s => {
                    const activo = sel.includes(s);
                    const g = enGrupo[s];
                    return `
                      <button type="button" class="riv-chip ${activo ? 'is-on' : ''} ${g && !activo ? 'is-ocupado' : ''}" aria-pressed="${activo}"
                        onclick="toggleRivPiloto('${s}')" ${!activo && sel.length >= 3 ? 'disabled' : ''}
                        title="${g ? 'Ya está en ' + g.pilotos.map(nombre).join(' vs ') : 'Sin rivalidad'}">
                        <span class="driver-avatar">${avatarPiloto(piloto(s))}</span>
                        <span class="riv-chip-texto"><strong>${nombre(s)}</strong><small>${ovr(s) ? 'OVR ' + ovr(s) : ''}${g ? ' · ya tiene rival' : ''}</small></span>
                      </button>`;
                  }).join('')}
                </div>
              </div>`).join('')}
          </div>
          <div class="riv-barra">
            <div class="riv-preview" aria-live="polite">
              ${sel.length ? sel.map(nombre).join(' <span class="vs">vs</span> ') : 'Toca 2 o 3 pilotos para formar el grupo'}
              <small>${sel.length}/3 · ${sel.length === 2 ? 'pareja' : sel.length === 3 ? 'trío' : 'mínimo 2'}</small>
            </div>
            <div class="riv-barra-acciones">
              ${sel.length ? '<button type="button" class="btn btn-secondary" onclick="state.ui.rivSeleccion=[];renderApp();">Limpiar</button>' : ''}
              <button type="button" class="btn btn-primary" ${valido ? '' : 'disabled'} onclick="anadirRivalidad()">Añadir rivalidad</button>
            </div>
          </div>
          ${sinRival.length >= 2 ? `<button type="button" class="link-btn" onclick="sugerirRivalidad()">Sugerir pareja por valoración entre los que no tienen rival (${sinRival.map(nombre).join(', ')})</button>` : ''}

          <h2 class="admin-subtitulo">Rivalidades del ${t.nombre} (${grupos.length})</h2>
          <ul class="riv-lista">
            ${grupos.map(g => `
              <li class="riv-item">
                <span class="riv-item-pilotos">
                  ${g.pilotos.map(s => `<span class="riv-item-piloto"><span class="driver-avatar">${avatarPiloto(piloto(s))}</span>${nombre(s)}</span>`).join('<span class="vs">vs</span>')}
                </span>
                <span class="badge-pill">${g.pilotos.length === 2 ? 'Pareja' : 'Trío'}</span>
                <button type="button" class="icon-btn" aria-label="Eliminar rivalidad" onclick="eliminarRivalidad('${g.id}')">✕</button>
              </li>`).join('') || '<li class="riv-item is-vacio">No hay rivalidades en este split.</li>'}
          </ul>
          <p class="evo-nota">Se guardan solo en este split. El premio se calcula en cada carrera según las posiciones y el reglamento. En el prototipo los cambios no se guardan en la liga.</p>
        </section>`;
    }

    window.toggleRivPiloto = function(slug) {
      const sel = state.ui.rivSeleccion || (state.ui.rivSeleccion = []);
      const i = sel.indexOf(slug);
      if (i >= 0) sel.splice(i, 1); else if (sel.length < 3) sel.push(slug);
      renderApp();
    };

    window.anadirRivalidad = function() {
      const t = splitAdmin('adminRivSplit');
      const sel = state.ui.rivSeleccion || [];
      if (sel.length < 2 || sel.length > 3) return;
      // Un piloto solo tiene una rivalidad por split: sale de la anterior al entrar en la nueva.
      t.rivalidades = (t.rivalidades || []).map(g => ({ ...g, pilotos: g.pilotos.filter(s => !sel.includes(s)) })).filter(g => g.pilotos.length >= 2);
      t.rivalidades.push({ id: 'rivalidad_' + Date.now(), pilotos: [...sel] });
      state.ui.rivSeleccion = [];
      showToast('Rivalidad añadida (prototipo: no se guarda en la liga).');
      renderApp();
    };

    window.eliminarRivalidad = function(id) {
      const t = splitAdmin('adminRivSplit');
      const antes = t.rivalidades;
      t.rivalidades = (t.rivalidades || []).filter(g => g.id !== id);
      state.ui.lastEconomyUndo = () => { t.rivalidades = antes; renderApp(); };
      showToast('Rivalidad eliminada.', true);
      renderApp();
    };

    window.sugerirRivalidad = function() {
      const t = splitAdmin('adminRivSplit');
      const ocupados = new Set((t.rivalidades || []).flatMap(g => g.pilotos));
      const libres = Object.keys(t.pilotos).filter(s => !ocupados.has(s)).sort((a, b) => (t.pilotos[b].ovr || 0) - (t.pilotos[a].ovr || 0));
      state.ui.rivSeleccion = libres.slice(0, 2);
      renderApp();
    };

