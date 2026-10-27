    /* ==========================================================================
       ACCIONES REALES (tool/prototipo-acciones.js, lo inserta tool/conectar-prototipo.mjs)
       Sustituye las acciones simuladas del prototipo: las conectadas llaman a
       window.bugambraAcciones (src/prototipo/acciones.ts), que usa los servicios auditados
       de la app; las que aún no lo están avisan y abren el panel completo.
       ========================================================================== */
    function panelCompleto() {
      return ({ admin: '/admin', jeque: '/jeque', piloto: '/piloto' })[state.ui.role] || '/usuario';
    }

    /** Lo que aún no está en el diseño: avisa y abre el panel completo, donde sí se guarda. */
    window.bugambraPendiente = function(que) {
      openMoneyConfirmModal({
        titulo: 'Se hace en el panel completo',
        resumen: `${que}: todavía no está conectado en esta pantalla.`,
        detalleExtra: 'Al confirmar se abre el panel completo, donde se guarda en la liga con su registro.',
        onConfirm: () => { window.location.href = panelCompleto(); }
      });
    };

    const valorNumero = (id) => Number(String((document.getElementById(id) || {}).value || '').replace(',', '.'));

    // ── Economía y fichajes ──
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
          <span class="form-field"><label for="pactoTipo">Tipo de operación</label>
            <select id="pactoTipo" class="form-input"><option value="">Elige…</option><option value="mantener">Mantener</option><option value="clausula">Cláusula</option><option value="subasta">Subasta</option></select></span>
          <span class="form-field"><label for="pactoPrecio">Precio (M€)</label><input id="pactoPrecio" class="form-input" type="number" step="0.1" value="${p.mantener ?? ''}"></span>
          Si el split siguiente aún no existe, se creará vacío.`,
        onConfirm: () => {
          const tipo = document.getElementById('pactoTipo').value;
          bugambraAccion(() => bugambraAcciones.pactar({ splitId: t.id, slug, destino: window.__pactoDestino || p.equipo, precio: valorNumero('pactoPrecio'), tipo }));
        }
      });
    };

    window.adminAccionPiloto = function(accion, slug) {
      const t = temporadaActual();
      const p = t.pilotos[slug];
      if (accion === 'liberar') return openMoneyConfirmModal({
        titulo: `Liberar a ${p.nombre}`,
        resumen: `${p.nombre} sale de ${nombreEquipo(p.equipo)} y queda como agente libre en el ${t.nombre}.`,
        detalleExtra: 'No se mueve ningún saldo: el dinero solo se mueve al pactar o al deshacer un pacto.',
        onConfirm: () => bugambraAccion(() => bugambraAcciones.liberar({ splitId: t.id, slug }))
      });
      if (accion === 'clausula') return openMoneyConfirmModal({
        titulo: `Ajustar la cláusula · ${p.nombre}`,
        resumen: `Ahora ${fmtNum(p.clausula)} M€. No mueve saldo: queda apuntado en el libro.`,
        detalleExtra: `
          <span class="form-field"><label for="clausulaNueva">Cláusula nueva (M€)</label><input id="clausulaNueva" class="form-input" type="number" step="0.1" placeholder="Vacío: volver a la automática"></span>
          <span class="form-field"><label for="clausulaMotivo">Motivo</label><input id="clausulaMotivo" class="form-input"></span>`,
        onConfirm: () => {
          const bruto = document.getElementById('clausulaNueva').value.trim();
          const motivo = document.getElementById('clausulaMotivo').value;
          bugambraAccion(() => bugambraAcciones.clausula({ splitId: t.id, slug, importe: bruto ? valorNumero('clausulaNueva') : null, motivo }));
        }
      });
      if (accion === 'deshacer') return openMoneyConfirmModal({
        titulo: `Deshacer · ${p.nombre}`,
        resumen: p.proxEquipo
          ? `Se anula el pacto de ${p.nombre} con ${nombreEquipo(p.proxEquipo)} y se devuelve el importe.`
          : `Se deshace el alta de ${p.nombre} y se devuelve el importe a ${nombreEquipo(p.equipo)}.`,
        detalleExtra: 'Queda apuntado en el libro de movimientos.',
        onConfirm: () => bugambraAccion(() => bugambraAcciones.deshacer({ splitId: t.id, slug }))
      });
      openMoneyConfirmModal({
        titulo: `Corregir precio de compra · ${p.nombre}`,
        resumen: `Ahora ${fmtNum(p.compra)} M€. La diferencia se ajusta en el saldo de ${nombreEquipo(p.equipo)}.`,
        detalleExtra: `
          <span class="form-field"><label for="precioNuevo">Precio nuevo (M€)</label><input id="precioNuevo" class="form-input" type="number" step="0.1" value="${p.compra ?? ''}"></span>
          <span class="form-field"><label for="precioMotivo">Motivo</label><input id="precioMotivo" class="form-input" placeholder="Ej.: error al apuntar la subasta"></span>`,
        onConfirm: () => {
          const motivo = document.getElementById('precioMotivo').value;
          bugambraAccion(() => bugambraAcciones.corregirPrecio({ splitId: t.id, slug, precio: valorNumero('precioNuevo'), motivo }));
        }
      });
    };

    // ── Rivalidades: se guarda la lista entera del split, como en el panel ──
    window.anadirRivalidad = function() {
      const t = splitAdmin('adminRivSplit');
      const sel = state.ui.rivSeleccion || [];
      if (sel.length < 2 || sel.length > 3) return;
      // Un piloto solo tiene una rivalidad por split: sale de la anterior al entrar en la nueva.
      const grupos = (t.rivalidades || []).map(g => ({ ...g, pilotos: g.pilotos.filter(s => !sel.includes(s)) })).filter(g => g.pilotos.length >= 2);
      grupos.push({ id: 'rivalidad_' + Date.now(), pilotos: [...sel] });
      state.ui.rivSeleccion = [];
      bugambraAccion(() => bugambraAcciones.rivalidades({ splitId: t.id, grupos }));
    };

    window.eliminarRivalidad = function(id) {
      const t = splitAdmin('adminRivSplit');
      bugambraAccion(() => bugambraAcciones.rivalidades({ splitId: t.id, grupos: (t.rivalidades || []).filter(g => g.id !== id) }));
    };

    // ── Mercado: solo se ve cuando el admin lo abre ──
    window.bugambraAlternarMercado = function() {
      const t = temporadaActual();
      const abierto = !!t.mercadoAbierto;
      openMoneyConfirmModal({
        titulo: abierto ? 'Cerrar el mercado' : 'Abrir el mercado',
        resumen: abierto ? `El mercado del ${t.nombre} deja de verse en la app.` : `El mercado del ${t.nombre} aparecerá en el menú de todos.`,
        onConfirm: () => bugambraAccion(() => bugambraAcciones.alternarMercado({ splitId: t.id, abierto }))
      });
    };

    // ── Buzón: la colección real de propuestas ──
    window.enviarPropuestaBuzon = function() {
      const categoria = document.getElementById('buzonCat').value;
      const titulo = document.getElementById('buzonTitulo').value.trim();
      if (!titulo) return;
      bugambraAccion(() => bugambraAcciones.proponer({ categoria, titulo }));
    };

    const ESTADO_PROPUESTA = { pendiente: 'pendiente', revisando: 'en revisión', aprobado: 'aprobada', descartado: 'descartada', completado: 'hecha' };
    const CATEGORIA_PROPUESTA = { interfaz: 'Interfaz', mercado: 'Economía y Mercado', reglas: 'Carreras y FIA', bugs: 'Errores', otros: 'General' };
    state.propuestas = [];
    window.addEventListener('bugambra:propuestas', (e) => {
      state.propuestas = e.detail.slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).map(s => ({
        id: s.id, categoria: CATEGORIA_PROPUESTA[s.categoria] || s.categoria, titulo: s.titulo, autor: s.usuario_nombre || '—',
        estado: ESTADO_PROPUESTA[s.estado] || s.estado, respuestaAdmin: s.respuesta_admin || 'Pendiente de revisión.'
      }));
      if (['buzon', 'admin-sugerencias'].includes(parseHash().route)) renderApp();
    });

    // ── Aún sin conectar: avisan y abren el panel completo en vez de simular ──
    window.realizarPujaJeque = () => bugambraPendiente('Pujar en la subasta');
    window.votarPilotoDelDia = () => bugambraPendiente('Votar al piloto del día');
    window.procesarEconomiaCircuitoModal = () => bugambraPendiente('Procesar la economía');
    window.bugambraComenzarSplit = function() {
      const t = temporadaActual();
      openMoneyConfirmModal({
        titulo: `Comenzar el ${t.nombre}`,
        resumen: `Se cierra el mercado del ${t.nombre} y pasa a ser el split activo de la liga.`,
        detalleExtra: 'Antes revisa que todas las plantillas estén completas.',
        onConfirm: () => bugambraAccion(() => bugambraAcciones.comenzarSplit({ splitId: t.id }))
      });
    };
    window.accionPilotoEconomia = () => bugambraPendiente('Esta operación con el piloto');
    window.ejecutarDeshacerEconomia = () => {};

    // ── Carreras y actas ──
    /** Lo que el admin ha rellenado en la tabla del acta. */
    function filasActa() {
      return [...document.querySelectorAll('#actaTabla tbody tr')].map(tr => ({
        slug: tr.dataset.piloto,
        q: tr.querySelector('.acta-q').value,
        c: tr.querySelector('.acta-c').value,
        vr: tr.querySelector('input[name="actaVr"]').checked,
        limpio: tr.querySelector('.acta-fia').value === 'Limpio',
        sancion: tr.querySelector('.acta-s').disabled ? '' : tr.querySelector('.acta-s').value
      }));
    }

    window.reabrirActaAdmin = function(orden) {
      const g = gpDeTemporada(orden);
      openMoneyConfirmModal({
        titulo: `Reabrir acta · GP ${orden} (${g.pais || ''})`,
        resumen: g.economiaProcesada
          ? 'Su economía ya está procesada: se revierte primero (cada escudería devuelve lo cobrado y los precios vuelven a como estaban). Después corriges, cierras el acta y la procesas de nuevo.'
          : 'Vuelve a permitir corregir los resultados.',
        onConfirm: () => bugambraAccion(() => bugambraAcciones.reabrirActa({ splitId: temporadaActual().id, n: Number(orden) }))
      });
    };

    /** Con el acta cerrada, en lugar de los botones de guardar, el aviso y «Reabrir acta». */
    function botonReabrirActa(orden) {
      return gpDeTemporada(orden).actaCerrada
        ? `<p class="acta-aviso is-error" style="margin-top:var(--sp-2);">El acta está cerrada: los cambios de la tabla no se guardan hasta reabrirla.</p>
           <button type="button" class="btn btn-secondary" style="margin-top:var(--sp-2);" onclick="reabrirActaAdmin(${orden})">Reabrir acta${gpDeTemporada(orden).economiaProcesada ? ' (revierte su economía)' : ''}</button>`
        : '';
    }

    function guardarActa(orden, cerrar) {
      if (gpDeTemporada(orden).actaCerrada) return reabrirActaAdmin(orden);
      const c = state.carreras.find(x => x.orden === orden);
      const filas = filasActa();
      openMoneyConfirmModal({
        titulo: `${cerrar ? 'Cerrar acta' : 'Guardar resultados'} · GP ${orden} (${c ? c.pais : ''})`,
        resumen: cerrar
          ? 'Se guardan los resultados y se cierra el acta: después ya no se pueden cambiar sin reabrirla, y se podrá procesar la economía.'
          : 'Se guardan los resultados. El acta sigue abierta para corregirla.',
        detalleExtra: 'Se comprueban la pole, la vuelta rápida y los puestos repetidos antes de guardar.',
        onConfirm: () => bugambraAccion(() => bugambraAcciones.guardarActa({ splitId: temporadaActual().id, n: orden, filas, cerrar }))
      });
    }
    window.guardarActaAdmin = (orden) => guardarActa(orden, false);
    window.confirmarCerrarActaAdmin = (orden) => guardarActa(orden, true);

    /** Formulario de decisión FIA ligado al acta: el piloto sale de la parrilla del GP. */
    function renderFormFia(orden) {
      const t = temporadaActual();
      const pilotos = clasificacionEquipos(t).flatMap(r => r.pilotos.filter(s => t.pilotos[s]).map(s => ({ slug: s, nombre: t.pilotos[s].nombre })));
      const efectos = ['+3 s', '+5 s', '+10 s', 'Advertencia'];
      return `
        <form class="clean-table-panel" onsubmit="event.preventDefault(); agregarDecisionFiaAdmin(${orden});" style="display:flex;flex-direction:column;gap:var(--sp-2);">
          <h2 class="section-title">Añadir decisión FIA</h2>
          <select id="fiaPilotoInput" class="form-input" required data-orden="${orden}" onchange="this.dataset.elegidoAMano = '1'; marcarSancionadoEnActa(this.value)">
            <option value="">Piloto sancionado…</option>
            ${pilotos.map(p => `<option value="${p.slug}">${p.nombre}</option>`).join('')}
          </select>
          <input id="fiaMotivoInput" class="form-input" placeholder="Motivo: qué pasó" required>
          <input id="fiaEfectoInput" class="form-input" placeholder="Efecto (+5 s, pierde un puesto…)" required>
          <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2);">
            ${efectos.map(e => `<button type="button" class="pill-filter" onclick="document.getElementById('fiaEfectoInput').value='${e}'">${e}</button>`).join('')}
          </div>
          <input id="fiaMultaInput" class="form-input" placeholder="Multa (opcional, se anota sin cobrar)">
          <button type="submit" class="btn btn-secondary">Añadir decisión</button>
        </form>`;
    }

    /**
     * «Piloto sancionado» sigue a la tabla: arriba los sancionados que aún no tienen decisión FIA,
     * luego los que ya la tienen y luego el resto; y, si el admin no eligió otro, el primero pendiente.
     */
    function actualizarPilotoFia() {
      const form = document.getElementById('fiaPilotoInput');
      if (!form) return;
      const filas = [...document.querySelectorAll('#actaTabla tr[data-piloto]')];
      const nombre = (tr) => (temporadaActual().pilotos[tr.dataset.piloto] || {}).nombre || tr.dataset.piloto;
      const conDecision = new Set((gpDeTemporada(form.dataset.orden).fia || []).map(d => d.piloto));
      const sancionado = (tr) => tr.querySelector('.acta-fia').value === 'Sancionado';
      const grupos = [
        ['Sancionados en el acta, sin decisión FIA', filas.filter(tr => sancionado(tr) && !conDecision.has(tr.dataset.piloto))],
        ['Ya tienen decisión FIA', filas.filter(tr => conDecision.has(tr.dataset.piloto))],
        ['Resto de la parrilla', filas.filter(tr => !sancionado(tr) && !conDecision.has(tr.dataset.piloto))]
      ];
      const elegido = form.value;
      form.innerHTML = '<option value="">Piloto sancionado…</option>' + grupos.filter(([, trs]) => trs.length).map(([titulo, trs]) =>
        `<optgroup label="${titulo}">${trs.map(tr => `<option value="${tr.dataset.piloto}">${nombre(tr)}</option>`).join('')}</optgroup>`).join('');
      const pendientes = grupos[0][1];
      form.value = form.dataset.elegidoAMano || (elegido && pendientes.some(tr => tr.dataset.piloto === elegido))
        ? elegido : (pendientes[0] ? pendientes[0].dataset.piloto : elegido);
    }

    /** Efecto que se deduce de la fila: el puesto tras la sanción, o vacío. */
    function efectoDeFila(tr) {
      const pista = tr.querySelector('.acta-c').value;
      const tras = tr.querySelector('.acta-s').disabled ? '' : tr.querySelector('.acta-s').value;
      if (!tras) return '';
      if (tras === 'DSQ') return 'Descalificación';
      return pista && pista !== tras ? `${pista}.º → ${tras}.º en pista` : `${tras}.º tras sanción`;
    }

    /** En cada fila sancionada, su botón para registrar la decisión FIA de ese piloto. */
    function botonesFiaEnActa() {
      const form = document.getElementById('fiaPilotoInput');
      if (!form) return;
      const conDecision = new Set((gpDeTemporada(form.dataset.orden).fia || []).map(d => d.piloto));
      document.querySelectorAll('#actaTabla tr[data-piloto]').forEach(tr => {
        const celda = tr.querySelector('.acta-s').parentElement;
        let boton = celda.querySelector('.acta-fia-btn');
        if (tr.querySelector('.acta-fia').value !== 'Sancionado') { if (boton) boton.remove(); return; }
        if (!boton) {
          boton = document.createElement('button');
          boton.type = 'button';
          boton.className = 'pill-filter acta-fia-btn';
          boton.style.marginTop = 'var(--sp-1)';
          boton.onclick = () => decisionFiaDePiloto(tr.dataset.piloto);
          celda.appendChild(boton);
        }
        boton.textContent = conDecision.has(tr.dataset.piloto) ? '✓ Otra decisión FIA' : '+ Decisión FIA';
      });
    }

    /** La decisión FIA de un piloto sancionado, rellenada desde su fila del acta. */
    window.decisionFiaDePiloto = function(slug) {
      const form = document.getElementById('fiaPilotoInput');
      const orden = Number(form.dataset.orden);
      const tr = document.querySelector(`#actaTabla tr[data-piloto="${slug}"]`);
      const nombre = (temporadaActual().pilotos[slug] || {}).nombre || slug;
      const efectos = ['+3 s', '+5 s', '+10 s', 'Advertencia'];
      openMoneyConfirmModal({
        titulo: `Decisión FIA · ${nombre} · GP ${orden}`,
        resumen: 'Escribe qué pasó; el efecto ya viene del acta si le cambiaste el puesto.',
        detalleExtra: `
          <span class="form-field"><label for="fiaModalMotivo">Motivo</label><input id="fiaModalMotivo" class="form-input" placeholder="Qué pasó"></span>
          <span class="form-field"><label for="fiaModalEfecto">Efecto</label><input id="fiaModalEfecto" class="form-input" value="${atributo(efectoDeFila(tr))}"></span>
          <span style="display:flex;flex-wrap:wrap;gap:var(--sp-2);margin:var(--sp-2) 0;">${efectos.map(e => `<button type="button" class="pill-filter" onclick="document.getElementById('fiaModalEfecto').value='${e}'">${e}</button>`).join('')}</span>
          <span class="form-field"><label for="fiaModalMulta">Multa (opcional, se anota sin cobrar)</label><input id="fiaModalMulta" class="form-input"></span>`,
        onConfirm: () => {
          const campo = (id) => document.getElementById(id).value.trim();
          bugambraAccion(() => bugambraAcciones.decisionFia({ splitId: temporadaActual().id, n: orden, piloto: slug, motivo: campo('fiaModalMotivo'), efecto: campo('fiaModalEfecto'), multa: campo('fiaModalMulta') }));
        }
      });
      setTimeout(() => { const m = document.getElementById('fiaModalMotivo'); if (m) m.focus(); }, 50);
    };

    const validarActaOriginal = window.validarActa;
    window.validarActa = function() {
      validarActaOriginal();
      actualizarPilotoFia();
      botonesFiaEnActa();
    };

    /** Del formulario al acta: el piloto elegido queda «Sancionado» en su fila. */
    window.marcarSancionadoEnActa = function(slug) {
      const fila = document.querySelector(`#actaTabla tr[data-piloto="${slug}"]`);
      if (!fila) return;
      fila.querySelector('.acta-fia').value = 'Sancionado';
      validarActa();
    };

    // Del acta al formulario: marcar «Sancionado» elige al piloto, y el puesto tras la sanción escribe el efecto.
    document.addEventListener('change', (e) => {
      const fila = e.target.closest && e.target.closest('#actaTabla tr[data-piloto]');
      const form = document.getElementById('fiaPilotoInput');
      if (!fila || !form) return;
      if (e.target.matches('.acta-fia') && e.target.value === 'Sancionado') {
        delete form.dataset.elegidoAMano;
        form.value = fila.dataset.piloto;
        document.getElementById('fiaMotivoInput').focus();
      }
      if (e.target.matches('.acta-s') && e.target.value) {
        form.value = fila.dataset.piloto;
        const pista = fila.querySelector('.acta-c').value;
        document.getElementById('fiaEfectoInput').value = e.target.value === 'DSQ' ? 'Descalificación'
          : pista && pista !== e.target.value ? `${pista}.º → ${e.target.value}.º en pista` : `${e.target.value}.º tras sanción`;
      }
    });

    window.agregarDecisionFiaAdmin = function(orden) {
      const campo = (id) => document.getElementById(id).value.trim();
      const select = document.getElementById('fiaPilotoInput');
      const d = { piloto: campo('fiaPilotoInput'), motivo: campo('fiaMotivoInput'), efecto: campo('fiaEfectoInput'), multa: campo('fiaMultaInput') };
      const nombre = select.selectedOptions[0] ? select.selectedOptions[0].textContent : d.piloto;
      openMoneyConfirmModal({
        titulo: 'Confirmar decisión FIA',
        resumen: `${nombre}: ${d.motivo} → ${d.efecto}${d.multa ? ` · multa ${d.multa}` : ''}.`,
        detalleExtra: 'Queda en el acta del GP. La multa se anota pero no se cobra del saldo.',
        onConfirm: () => bugambraAccion(() => bugambraAcciones.decisionFia({ splitId: temporadaActual().id, n: orden, ...d }))
      });
    };

    // ── Economía: fichaje fuera de la subasta y ajuste de saldo ──
    window.bugambraFicharAlta = function() {
      const t = splitAdmin('adminEcoSplit');
      const piloto = document.getElementById('altaNombre').value.trim();
      const equipo = document.getElementById('altaEquipo').value;
      const precio = valorNumero('altaPrecio');
      openMoneyConfirmModal({
        titulo: 'Confirmar fichaje',
        resumen: `${piloto} ficha por ${nombreEquipo(equipo)} en el ${t.nombre} por ${fmtNum(precio)} M€, que se restan de su saldo.`,
        detalleExtra: 'Fuera de la subasta: no se ve en directo. Queda en el libro y se puede deshacer.',
        onConfirm: () => {
          state.ui.adminAltaAbierta = false;
          bugambraAccion(() => bugambraAcciones.fichar({ splitId: t.id, piloto, equipo, precio }));
        }
      });
    };

    window.ajustarSaldoEscuderiaModal = function(eqId) {
      const t = splitAdmin('adminEcoSplit');
      openMoneyConfirmModal({
        titulo: `Ajustar saldo · ${nombreEquipo(eqId)}`,
        resumen: 'Suma o resta al saldo de la escudería. Queda en el libro con su motivo.',
        detalleExtra: `
          <span class="form-field"><label for="saldoImporte">Importe (M€, negativo para restar)</label><input id="saldoImporte" class="form-input" type="number" step="0.1"></span>
          <span class="form-field"><label for="saldoMotivo">Motivo</label><input id="saldoMotivo" class="form-input"></span>`,
        onConfirm: () => {
          const motivo = document.getElementById('saldoMotivo').value;
          bugambraAccion(() => bugambraAcciones.ajustarSaldo({ splitId: t.id, equipo: eqId, importe: valorNumero('saldoImporte'), motivo }));
        }
      });
    };

    // ── Jeque: logo de su escudería ──
    window.bugambraCambiarLogo = function() {
      const eq = miEquipoId();
      if (!eq) return;
      openMoneyConfirmModal({
        titulo: `Logo de ${nombreEquipo(eq)}`,
        resumen: 'Pega el enlace de la imagen del logo. Vacío para quitarlo.',
        detalleExtra: '<span class="form-field"><label for="logoUrl">Enlace de la imagen</label><input id="logoUrl" class="form-input" type="url" placeholder="https://…"></span>',
        onConfirm: () => {
          const url = document.getElementById('logoUrl').value;
          bugambraAccion(() => bugambraAcciones.logo({ splitId: temporadaActual().id, equipo: eq, url }));
        }
      });
    };

    // ── Usuarios y roles: las cuentas reales ──
    const ROL_A_FIRESTORE = { director: 'director_deportivo' };
    const ROL_DE_FIRESTORE = { director_deportivo: 'director' };
    state.usuariosReales = null;
    function cargarUsuarios() {
      state.usuariosReales = 'cargando';
      bugambraAcciones.usuarios().then(r => {
        state.usuariosReales = r.ok ? r.usuarios : [];
        if (!r.ok && r.mensaje) showToast(r.mensaje);
        if (parseHash().route === 'admin-usuarios') renderApp();
      });
    }

    renderAdminUsuariosSection = function() {
      if (state.usuariosReales === null && window.bugambraAcciones) cargarUsuarios();
      const lista = Array.isArray(state.usuariosReales) ? state.usuariosReales : [];
      const roles = ['invitado', 'usuario', 'piloto', 'director', 'jeque', 'admin'];
      return `
        <section class="section-card">
          <div class="section-header"><h1 class="section-title">4. Usuarios y Roles</h1></div>
          <div class="clean-table-panel">
            ${!Array.isArray(state.usuariosReales) ? '<p style="color:var(--text-muted);">Cargando cuentas…</p>' : `
            <table class="standings-table">
              <thead><tr><th>USUARIO</th><th>ROL</th><th>ESCUDERÍA</th><th>ACCIÓN</th></tr></thead>
              <tbody>
                ${lista.map(u => {
                  const rol = ROL_DE_FIRESTORE[u.rol] || u.rol;
                  return `
                  <tr>
                    <td><strong>${u.nombre}</strong><div style="font-size:var(--fs-xs);color:var(--text-muted);">${u.email}</div></td>
                    <td><select id="rolUsr_${u.uid}" class="form-input">${roles.map(r => `<option value="${r}" ${rol === r ? 'selected' : ''}>${r.toUpperCase()}</option>`).join('')}</select></td>
                    <td><select id="eqUsr_${u.uid}" class="form-input">
                      <option value="" ${!u.equipo ? 'selected' : ''}>Sin escudería</option>
                      ${ORDEN_SERIE.map(id => `<option value="${id}" ${u.equipo === id ? 'selected' : ''}>${nombreEquipo(id)}</option>`).join('')}
                    </select></td>
                    <td><button type="button" class="btn btn-secondary" onclick="guardarUsuarioAdmin('${u.uid}')">Guardar</button></td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>`}
          </div>
        </section>
      `;
    };

    window.guardarUsuarioAdmin = function(uid) {
      const u = (state.usuariosReales || []).find(x => x.uid === uid);
      if (!u) return;
      const rol = document.getElementById(`rolUsr_${uid}`).value;
      const equipo = document.getElementById(`eqUsr_${uid}`).value;
      if ((rol === 'jeque' || rol === 'director') && !equipo) {
        showToast('Para jeque y director deportivo la escudería es obligatoria.');
        return;
      }
      bugambraAccion(async () => {
        const r = await bugambraAcciones.guardarUsuario({ splitId: temporadaActual().id, uid, rol: ROL_A_FIRESTORE[rol] || rol, equipo, pilotoId: u.pilotoId });
        if (r.ok) cargarUsuarios();
        return r;
      });
    };

    // ── Directo: cuando la liga (o Fabi) emite, el vídeo sale arriba del inicio y de la portada ──
    function directoActivo() {
      if (TWITCH.enDirecto) return { canal: TWITCH.canal, ...TWITCH.enDirecto };
      const otro = (TWITCH.canales || []).find(c => c.enDirecto);
      return otro ? { canal: otro.login, ...otro.enDirecto } : null;
    }

    function bloqueDirecto() {
      const d = directoActivo();
      if (!d) return '';
      return `
        <section class="section-card tv-directo is-live" style="margin-bottom:var(--sp-4);">
          <span class="badge-pill badge-split">En directo · ${d.espectadores} viendo</span>
          <h2 class="section-title">${d.titulo}</h2>
          ${reproductorTwitch({ canal: d.canal, titulo: d.titulo, directo: true })}
        </section>`;
    }

    // Twitch se consulta cada minuto: al empezar o acabar la emisión la página cambia sola.
    setInterval(() => {
      if (document.hidden || !window.cargarTwitch) return;
      const antes = (directoActivo() || {}).canal;
      cargarTwitch(fetch).then(t => {
        Object.assign(TWITCH, t);
        state.ui.tvStreamActive = !!t.enDirecto;
        if ((directoActivo() || {}).canal !== antes) { updateHeaderAndDrawer(); renderApp(); }
      }).catch(() => {});
    }, 60000);

    // ── Programación del GP (fecha, hora y vídeo de la vuelta rápida) ──
    const atributo = (v) => String(v || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    const gpDeTemporada = (orden) => temporadaActual().gps.find(g => g.n === Number(orden)) || {};

    function renderProgramacionAdmin(orden) {
      const g = gpDeTemporada(orden);
      return `
        <form class="clean-table-panel" onsubmit="event.preventDefault(); programarCarreraAdmin(${orden});" style="display:flex;flex-wrap:wrap;gap:var(--sp-3);align-items:end;margin-bottom:var(--sp-4);">
          <h2 class="section-title" style="width:100%;">Programación · GP ${orden} (${g.pais || ''} · ${g.circuito || ''})</h2>
          <div class="form-field"><label for="progNombre">Nombre del circuito</label><input id="progNombre" class="form-input" required value="${atributo(g.nombreGuardado)}"></div>
          <div class="form-field"><label for="progFecha">Fecha</label><input id="progFecha" class="form-input" type="date" value="${atributo(g.fecha)}"></div>
          <div class="form-field"><label for="progHora">Hora</label><input id="progHora" class="form-input" type="time" value="${atributo(g.hora)}"></div>
          <div class="form-field" style="flex:1;min-width:260px;"><label for="progHotlap">Vídeo de la vuelta rápida (YouTube)</label><input id="progHotlap" class="form-input" type="url" placeholder="https://youtu.be/…" value="${atributo(g.hotlap)}"></div>
          <button type="submit" class="btn btn-primary">Guardar programación</button>
        </form>`;
    }

    window.programarCarreraAdmin = function(orden) {
      const valor = (id) => document.getElementById(id).value.trim();
      bugambraAccion(() => bugambraAcciones.programar({ splitId: temporadaActual().id, n: Number(orden), nombre: valor('progNombre'), fecha: valor('progFecha'), hora: valor('progHora'), hotlap: valor('progHotlap') }));
    };

    /** El vídeo de la vuelta rápida del GP: miniatura con play y, al pulsar, el reproductor. */
    function videoVueltaRapida(orden) {
      const url = gpDeTemporada(orden).hotlap;
      const yt = window.bugambraYoutube;
      if (!url || !yt || !yt.embed(url)) return '';
      return state.ui.vueltaRapidaAbierta === Number(orden)
        ? `<div class="tv-player"><iframe src="${atributo(yt.embed(url))}&autoplay=1" title="Vuelta rápida · GP ${orden}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`
        : `<button type="button" aria-label="Ver la vuelta rápida del GP ${orden}" onclick="state.ui.vueltaRapidaAbierta=${Number(orden)};renderApp();"
            style="position:relative;display:block;width:100%;aspect-ratio:16/9;border:0;padding:0;cursor:pointer;border-radius:var(--radius-md);background:#000 url('${atributo(yt.miniatura(url))}') center/cover no-repeat;">
            <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.25);border-radius:inherit;">
              <span style="display:flex;align-items:center;gap:0.5rem;padding:0.75rem 1.25rem;border-radius:999px;background:var(--accent-f1);color:#fff;font-weight:700;">▶ Ver la vuelta rápida</span>
            </span>
          </button>`;
    }

    function renderVueltaRapida(orden) {
      const video = videoVueltaRapida(orden);
      return video ? `
        <div class="clean-table-panel" style="margin-bottom:var(--sp-3);">
          <h3 class="section-title" style="margin-bottom:var(--sp-2);">Vídeo de la vuelta rápida</h3>
          ${video}
        </div>` : '';
    }

    // ── Mi escudería: el libro de movimientos de verdad, y si cuadra con el saldo ──
    state.libros = {};
    function cargarLibro(eq) {
      state.libros[eq] = { estado: 'cargando', movimientos: [] };
      bugambraAcciones.libro({ splitId: temporadaActual().id, equipo: eq }).then(r => {
        state.libros[eq] = r.ok ? { estado: r.estado, movimientos: r.movimientos } : { estado: 'error', movimientos: [] };
        if (parseHash().route === 'escuderia') renderApp();
      });
    }
    Object.defineProperty(state, 'movimientos', {
      configurable: true,
      get() {
        const eq = miEquipoId();
        if (eq && state.sesion && !state.libros[eq]) cargarLibro(eq);
        return (state.libros[eq] || {}).movimientos || [];
      },
      set() {}
    });
    // «Conciliado» solo si el último saldo apuntado en el libro coincide con el saldo de la escudería.
    Object.defineProperty(state.ui, 'saldoConciliado', {
      configurable: true,
      get() { return !['pending_reconciliation', 'balance_unknown', 'error'].includes((state.libros[miEquipoId()] || {}).estado); },
      set() {}
    });

    // ── Avisos oficiales: el último que publicó el comisario ──
    state.avisoReal = null;
    window.addEventListener('bugambra:sesion', (e) => {
      state.libros = {};
      if (!e.detail) { state.avisoReal = null; return; }
      bugambraAcciones.ultimoAviso().then(r => {
        state.avisoReal = r.ok ? r.aviso : null;
        if (parseHash().route === 'inicio') renderApp();
      });
    });
    function avisoInicio() {
      return state.avisoReal || { titulo: 'Sin avisos oficiales', texto: 'Cuando el comisario publique uno, saldrá aquí.' };
    }

    window.bugambraPublicarAviso = function() {
      const titulo = document.getElementById('avisoTitulo').value;
      const texto = document.getElementById('avisoTexto').value;
      openMoneyConfirmModal({
        titulo: 'Publicar aviso oficial',
        resumen: `«${titulo}» saldrá en el inicio de todos.`,
        onConfirm: () => bugambraAccion(async () => {
          const r = await bugambraAcciones.publicarAviso({ titulo, texto });
          if (r.ok) state.avisoReal = { titulo: titulo.trim(), texto: texto.trim() };
          return r;
        })
      });
    };

    const temporadaOriginal = renderAdminTemporadaSection;
    renderAdminTemporadaSection = function() {
      return temporadaOriginal() + `
        <form class="section-card" onsubmit="event.preventDefault(); bugambraPublicarAviso();" style="display:flex;flex-direction:column;gap:var(--sp-3);">
          <h2 class="section-title">Aviso oficial</h2>
          <p style="font-size:var(--fs-sm);color:var(--text-muted);">Último publicado: <strong>${avisoInicio().titulo}</strong></p>
          <div class="form-field"><label for="avisoTitulo">Título</label><input id="avisoTitulo" class="form-input" required placeholder="Ej.: Horario del GP de Imola"></div>
          <div class="form-field"><label for="avisoTexto">Texto</label><input id="avisoTexto" class="form-input" required placeholder="Ej.: El lobby se abre a las 22:15."></div>
          <button type="submit" class="btn btn-primary">Publicar aviso</button>
        </form>`;
    };

    // ── Mercado y subasta en vivo ──
    window.bugambraAlternarSubasta = function() {
      const t = temporadaActual();
      const activa = !!t.subastaEnVivo;
      openMoneyConfirmModal({
        titulo: activa ? 'Pausar la subasta en vivo' : 'Activar la subasta en vivo',
        resumen: activa ? 'Los jeques fichan directamente, sin sala de pujas.' : 'El mercado abre la sala de pujas en vivo.',
        onConfirm: () => bugambraAccion(() => bugambraAcciones.alternarSubasta({ splitId: t.id, activa }))
      });
    };

    /** La sala de pujas (reloj y pujas al momento) vive en el panel completo de cada rol. */
    function salaDePujas() {
      return `${({ jeque: '/jeque', admin: '/piloto', piloto: '/piloto' })[state.ui.role] || '/usuario'}?tab=market`;
    }
    renderMercadoView = function() {
      const t = temporadaActual();
      return `
        <section class="section-card" style="display:flex;flex-direction:column;gap:var(--sp-3);">
          <div class="section-header"><h1 class="section-title">Mercado · ${t.nombre}</h1><span class="badge-pill badge-split">Abierto</span></div>
          <p>${t.subastaEnVivo ? 'Subasta en vivo: los jeques pujan en la sala, con reloj y prórrogas.' : 'Fichaje directo: cada jeque ficha desde su panel.'}</p>
          <p style="font-size:var(--fs-sm);color:var(--text-muted);">${state.ui.role === 'jeque' ? 'Entra a la sala para pujar por los pilotos libres.' : 'Puedes seguir las pujas en directo desde la sala.'}</p>
          <a class="btn btn-primary" style="align-self:flex-start;" href="${salaDePujas()}">Entrar a la sala de pujas</a>
        </section>`;
    };

    // ── Presupuesto inicial de una escudería (Economía) ──
    window.bugambraPresupuestoInicial = function(eqId) {
      const t = splitAdmin('adminEcoSplit');
      openMoneyConfirmModal({
        titulo: `Presupuesto inicial · ${nombreEquipo(eqId)} (${t.nombre})`,
        resumen: 'La diferencia con el inicial actual se suma o resta al saldo y queda en el libro.',
        detalleExtra: '<span class="form-field"><label for="presIni">Presupuesto inicial (M€)</label><input id="presIni" class="form-input" type="number" step="0.1"></span>',
        onConfirm: () => bugambraAccion(() => bugambraAcciones.presupuestoInicial({ splitId: t.id, equipo: eqId, importe: valorNumero('presIni') }))
      });
    };

    // ── Inicio según el momento de la carrera: vuelta rápida antes, directo durante, resultado después ──
    /**
     * Con directo, solo el directo. Si el último GP ya tiene acta y el siguiente aún no tiene fecha y
     * hora, su clasificación. Si no, la vuelta rápida de referencia del siguiente GP.
     */
    function bloqueCarreraInicio() {
      if (directoActivo()) return '';
      const t = temporadaActual();
      const ultima = [...t.gps].reverse().find(g => g.disputada);
      const proxima = t.gps.find(g => !g.disputada);
      if (ultima && !(proxima && proxima.fecha && proxima.hora)) return resultadoInicio(ultima);
      if (proxima) return vueltaRapidaInicio(proxima);
      return '';
    }

    function vueltaRapidaInicio(g) {
      const video = videoVueltaRapida(g.n);
      if (!video) {
        return state.ui.role === 'admin'
          ? `<section class="section-card" style="margin-bottom:var(--sp-4);"><p style="color:var(--text-muted);">Aún no hay vuelta rápida de referencia del GP ${g.n} (${g.circuito}). <a href="#admin-carreras" style="font-weight:700;">Publícala en Carreras y actas →</a></p></section>`
          : '';
      }
      return `
        <section class="section-card" style="margin-bottom:var(--sp-4);">
          <span class="eyebrow">Vuelta rápida de referencia · GP ${g.n}</span>
          <h2 class="section-title" style="margin-bottom:var(--sp-3);">${g.pais} · ${g.circuito}</h2>
          ${video}
        </section>`;
    }

    function resultadoInicio(g) {
      const c = state.carreras.find(x => x.orden === g.n);
      if (!c) return '';
      return `
        <section class="section-card" style="margin-bottom:var(--sp-4);">
          <div class="section-header">
            <div>
              <span class="eyebrow">Resultado · GP ${g.n}</span>
              <h2 class="section-title">${g.pais} · ${g.circuito}</h2>
            </div>
            <a href="#carreras" class="btn btn-secondary" onclick="state.ui.selectedCarreraOrden=${g.n};">Ver el acta</a>
          </div>
          <div class="clean-table-panel">
            <table class="standings-table">
              <thead><tr><th>POS</th><th>PILOTO</th><th>ESCUDERÍA</th><th class="col-right">PTS</th></tr></thead>
              <tbody>
                ${c.resultadosDetalle.map(r => `
                  <tr>
                    <td>${r.estadoPos}</td>
                    <td>${renderPilotTrigger(r.piloto)}</td>
                    <td>${r.escuderia}</td>
                    <td class="col-right"><strong>+${r.puntos}</strong></td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </section>`;
    }

