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
    window.solicitarSubirClausulaJeque = () => bugambraPendiente('Subir una cláusula');
    window.votarPilotoDelDia = () => bugambraPendiente('Votar al piloto del día');
    window.procesarEconomiaCircuitoModal = () => bugambraPendiente('Procesar la economía');
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

    function guardarActa(orden, cerrar) {
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

    window.agregarDecisionFiaAdmin = function(orden) {
      const campo = (id) => document.getElementById(id).value.trim();
      const d = { piloto: campo('fiaPilotoInput'), motivo: campo('fiaMotivoInput'), efecto: campo('fiaEfectoInput'), multa: campo('fiaMultaInput') };
      openMoneyConfirmModal({
        titulo: 'Confirmar decisión FIA',
        resumen: `${d.piloto}: ${d.motivo} → ${d.efecto}${d.multa ? ` · multa ${d.multa}` : ''}.`,
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

