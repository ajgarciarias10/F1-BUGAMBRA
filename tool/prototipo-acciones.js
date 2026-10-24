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
      if (accion === 'liberar') return bugambraPendiente(`Liberar a ${p.nombre}`);
      if (accion === 'clausula') return bugambraPendiente(`Ajustar la cláusula de ${p.nombre}`);
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
    window.solicitarSubirClausulaJeque = () => bugambraPendiente('Subir una cláusula');
    window.votarPilotoDelDia = () => bugambraPendiente('Votar al piloto del día');
    window.agregarDecisionFiaAdmin = () => bugambraPendiente('Registrar una decisión FIA');
    window.confirmarCerrarActaAdmin = () => bugambraPendiente('Cerrar el acta');
    window.ajustarSaldoEscuderiaModal = () => bugambraPendiente('Ajustar el saldo de una escudería');
    window.procesarEconomiaCircuitoModal = () => bugambraPendiente('Procesar la economía');
    window.accionPilotoEconomia = () => bugambraPendiente('Esta operación con el piloto');
    window.registrarAltaPilotoAdmin = () => bugambraPendiente('Fichar a un piloto fuera de la subasta');
    window.guardarUsuarioAdmin = () => bugambraPendiente('Cambiar roles y escuderías');
    window.ejecutarDeshacerEconomia = () => {};

    // Los usuarios del prototipo son de ejemplo: la lista real está en el panel completo.
    renderAdminUsuariosSection = function() {
      return `
        <section class="section-card">
          <div class="section-header"><h1 class="section-title">4. Usuarios y Roles</h1></div>
          <p style="color:var(--text-muted);margin-bottom:var(--sp-3);">Los roles y las escuderías de cada cuenta se cambian en el panel completo.</p>
          <a class="btn btn-primary" href="/admin">Abrir usuarios en el panel completo</a>
        </section>
      `;
    };

