// Convierte el prototipo aprobado (docs/redesign/prototipo-gemini/index.html) en la entrada
// de la app: quita la barra de simulación y pone la sesión real de src/prototipo/sesion.ts.
// El prototipo sigue siendo la fuente del diseño; este script es la capa de conexión.
// Uso: node tool/conectar-prototipo.mjs [salida]   (por defecto apps/web/index.html)
import { readFileSync, writeFileSync } from "node:fs";

const raiz = new URL("../", import.meta.url);
const salida = process.argv[2] ? new URL(process.argv[2], `file://${process.cwd()}/`) : new URL("apps/web/index.html", raiz);
let html = readFileSync(new URL("docs/redesign/prototipo-gemini/index.html", raiz), "utf8");

/** Cada cambio debe encajar una sola vez: si el prototipo cambia, mejor fallar que publicar a medias. */
function cambiar(viejo, nuevo) {
  const veces = typeof viejo === "string" ? html.split(viejo).length - 1 : (html.match(new RegExp(viejo.source, "g")) || []).length;
  if (veces !== 1) throw new Error(`conectar-prototipo: se esperaba 1 coincidencia y hay ${veces} de ${String(viejo).slice(0, 80)}`);
  html = html.replace(viejo, nuevo);
}

// ── Cabecera: instalable como la app (manifest, iconos) y la sesión real ──
cambiar("</head>", `  <link rel="manifest" href="/manifest.webmanifest" />
  <meta name="theme-color" content="#0b0c10" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Bugambra" />
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
</head>`);
cambiar("</body>", `  <script type="module" src="/src/prototipo/sesion.ts"></script>
</body>`);

// La app vive en «/» con rutas «#»: una dirección antigua (/nueva/portada, /login…) se corrige
// antes de pintar, conservando la sección, y las fotos van con ruta absoluta para no depender de ella.
cambiar("<head>", `<head>
  <script>
    (function () {
      var p = location.pathname.replace(/^\\/nueva(?=\\/|$)/, "").replace(/^\\/+|\\/+$/g, "");
      if (location.pathname !== "/") history.replaceState(null, "", "/" + (location.hash || (p ? "#" + p.replace(/\\//g, "-").replace(/^entrar$/, "login") : "")));
    })();
  </script>`);
cambiar("? `img/piloto-${p.slug}.jpg`", "? `/img/piloto-${p.slug}.jpg`");

// ── Fuera la barra de prototipo (rol, estado de datos, saldo y directo simulados) ──
cambiar(/\n *<!-- BARRA DE PROTOTIPO[\s\S]*?<\/aside>\n/, "\n");
cambiar(`      position: sticky;
      top: 46px;
      z-index: 900;`, `      position: sticky;
      top: 0;
      z-index: 900;`);
cambiar(`      const protoLiveBtn = document.getElementById('toggleLiveProtoBtn');
`, "");
cambiar(`        protoLiveBtn.setAttribute('aria-pressed', 'true');
        protoLiveBtn.textContent = 'Directo: EN VIVO';
`, "");
cambiar(`        protoLiveBtn.setAttribute('aria-pressed', 'false');
        protoLiveBtn.textContent = 'Directo: Apagado';
`, "");
cambiar(/\n *const protoConcBtn = document\.getElementById\('toggleConciliadoProtoBtn'\);\n *if \(protoConcBtn\) \{[\s\S]*?\n *\}\n/, "\n");
cambiar(`      document.getElementById('dataStateSelect').value = 'ready';
`, "");
cambiar(/\n *document\.getElementById\('roleSelect'\)\.addEventListener[\s\S]*?window\.toggleTvStream\(\);\n *\}\);\n/, "\n");
cambiar("Cambia el rol en la barra superior o vuelve al inicio.", "Tu cuenta no tiene acceso a esta sección.");

// ── Sesión real: rol, nombre, escudería y piloto salen del perfil (evento bugambra:sesion) ──
cambiar(/    \/\*\* Escudería del usuario del prototipo:[\s\S]*?\n    function miNombre\(role\) \{[\s\S]*?\n    \}\n/, `    /** Escudería de la cuenta: la del piloto enlazado o, para jeque y director, la de su perfil. */
    function miEquipoId() {
      const role = state.ui.role;
      if (!state.sesion || !['jeque', 'director', 'piloto'].includes(role)) return null;
      const p = miPiloto();
      if (role === 'piloto' && p && p.equipoId) return p.equipoId;
      return state.equipos.some(e => e.id === state.sesion.equipoId) ? state.sesion.equipoId : null;
    }
    function miPiloto() {
      const slug = state.sesion && state.sesion.pilotoSlug;
      return slug ? state.pilotos.find(p => p.slug === slug) || null : null;
    }
    function miNombre() {
      return (state.sesion && state.sesion.nombre) || 'bienvenido';
    }
    /** El mercado solo se enseña cuando el admin abre los fichajes del split en curso. */
    function mercadoAbierto() {
      return LIGA.some(t => t.enCurso && t.mercadoAbierto);
    }
`);

// Mi piloto y el mercado dependen de la cuenta y del split, no del rol de ejemplo.
cambiar("enCurso: !!s.activo,", "enCurso: !!s.activo, mercadoAbierto: !!s.fichajes_abiertos, subastaEnVivo: !!s.mercado_subasta_activado,");
cambiar(`      if (role === 'piloto') {
        links.push({ route: '#mi-piloto', label: 'Mi piloto', sub: 'Ficha y carrera' });`, `      if (miPiloto()) {
        links.push({ route: '#mi-piloto', label: 'Mi piloto', sub: 'Ficha y carrera' });`);
cambiar(`        { route: '#mercado', label: 'Mercado', sub: (role === 'jeque' || role === 'admin') ? 'Sala de pujas' : 'Solo consulta' },
`, `        ...(mercadoAbierto() ? [{ route: '#mercado', label: 'Mercado', sub: (role === 'jeque' || role === 'admin') ? 'Sala de pujas' : 'Solo consulta' }] : []),
`);
cambiar("      if (route === 'mi-piloto') return role === 'piloto';", "      if (route === 'mi-piloto') return !!miPiloto();\n      if (route === 'mercado') return mercadoAbierto();");
cambiar(`      const cuentas = { usuario: 'Álex', piloto: 'Fabi', director: miNombre('director'), jeque: miNombre('jeque'), admin: 'Comisario' };
`, "");
cambiar(`        const nombre = cuentas[role] || 'Mi cuenta';
        const foto = role === 'piloto' ? fotoPiloto(state.pilotos.find(p => p.slug === 'fabi')) : null;`,
`        const nombre = miNombre();
        const foto = miPiloto() ? fotoPiloto(miPiloto()) : state.sesion && state.sesion.foto;`);
cambiar(`      const p = state.pilotos.find(x => x.slug === 'fabi') || state.pilotos[0];
`, `      const p = miPiloto();
      if (!p) return '<section class="section-card"><h1 class="section-title">Mi piloto</h1><p style="color:var(--text-muted);margin-top:var(--sp-2);">Tu cuenta no tiene un piloto enlazado. Pídeselo al comisario.</p></section>';
`);
cambiar(`      const aliasMap = { usuario: 'Álex', piloto: 'Fabi', director: miNombre('director'), jeque: miNombre('jeque'), admin: 'Comisario Jefe' };
      const alias = aliasMap[role] || 'Miembro';`, `      const alias = miNombre();
      // Toda su carrera, también los splits en los que ya no corre.
      const trayectoria = state.sesion && state.sesion.pilotoSlug ? trayectoriaPiloto(state.sesion.pilotoSlug) : [];`);
cambiar(`<button type="button" class="btn btn-primary" onclick="showToast('Perfil guardado')">Guardar cambios</button>`,
`<button type="button" class="btn btn-primary" onclick="bugambraAccion(() => bugambraSesion.guardarAlias(document.getElementById('perfilAliasInput').value))">Guardar cambios</button>
              <button type="button" class="btn btn-secondary" onclick="bugambraAccion(() => bugambraSesion.salir())">Cerrar sesión</button>`);
cambiar(`              \${state.pilotos[0].trayectoria.map(t => \``, `              \${trayectoria.length ? '' : '<p style="color:var(--text-muted);">Sin trayectoria como piloto.</p>'}
              \${trayectoria.map(t => \``);

// Menú: hasta que cada acción viva en el diseño, el panel clásico (React) es donde se guarda de verdad.
cambiar(`        \${adminBlockHtml}
      \`;`, `        \${adminBlockHtml}
        \${isGuest ? '' : \`
          <div class="zara-section-label">Cuenta</div>
          <div class="zara-nav">
            <a href="\${({ admin: '/admin', jeque: '/jeque', piloto: '/piloto' })[role] || '/usuario'}" class="zara-link">
              <span>Panel completo</span>
              <small>Pujas, economía y actas</small>
            </a>
            <a href="javascript:void 0" class="zara-link" onclick="bugambraAccion(() => bugambraSesion.salir())">
              <span>Cerrar sesión</span>
              <small>\${miNombre()}</small>
            </a>
          </div>
        \`}
      \`;`);

// Mientras Firebase dice si hay sesión, una ruta privada espera en vez de echar a la portada.
cambiar(`      if (ADMIN_ROUTES.includes(route) && state.ui.role !== 'admin') {`, `      if (!state.sesionLista && !canAccessRoute('invitado', route)) {
        main.innerHTML = '<section class="section-card" style="text-align:center;"><h2 class="section-title">Cargando tu sesión...</h2></section>';
        return;
      }
      if (state.ui.role === 'invitado' && !canAccessRoute('invitado', route)) {
        window.location.hash = '#login';
        return;
      }

      if (ADMIN_ROUTES.includes(route) && state.ui.role !== 'admin') {`);

// ── Acceso: Google, correo, registro y recuperar contraseña de verdad ──
cambiar(`onclick="handleSimAuth('Google')"`, `onclick="bugambraEntrar('google')"`);
cambiar(`onsubmit="event.preventDefault(); handleSimAuth('correo');"`, `onsubmit="event.preventDefault(); bugambraEntrar('\${isRegister ? 'registro' : 'correo'}');"`);
cambiar(`                : \`<a href="#registro" style="font-weight:700;">Crear una cuenta</a>\``,
`                : \`<a href="#registro" style="font-weight:700;">Crear una cuenta</a><a href="javascript:void 0" onclick="bugambraEntrar('recuperar')">¿Olvidaste tu contraseña?</a>\``);
cambiar(/    window\.handleSimAuth = function\(metodo\) \{[\s\S]*?\n    \};\n/, `    /** Sesión real: la publica src/prototipo/sesion.ts al entrar, salir o cambiar el perfil. */
    const ROL_PROTOTIPO = { admin: 'admin', jeque: 'jeque', director_deportivo: 'director', piloto: 'piloto', usuario: 'usuario', invitado: 'usuario' };
    state.sesion = null;
    state.sesionLista = false;
    window.addEventListener('bugambra:sesion', (e) => {
      state.sesion = e.detail;
      state.sesionLista = true;
      state.ui.role = e.detail ? (ROL_PROTOTIPO[e.detail.rol] || 'usuario') : 'invitado';
      const route = parseHash().route;
      if (e.detail && ['login', 'registro', 'portada'].includes(route)) window.location.hash = '#inicio';
      else if (!e.detail && !canAccessRoute('invitado', route)) window.location.hash = '#portada';
      else renderApp();
    });

    /** Ejecuta una acción de la sesión y enseña su aviso. */
    window.bugambraAccion = async function(accion) {
      if (!window.bugambraSesion) { showToast('Conectando con la liga, vuelve a intentarlo en un momento.'); return; }
      const r = await accion();
      if (r.mensaje) showToast(r.mensaje);
      if (r.ok && state.sesion) recargarLiga();
    };

    window.bugambraEntrar = function(metodo) {
      const valor = (id) => (document.getElementById(id) || {}).value || '';
      if (metodo === 'google') return bugambraAccion(() => bugambraSesion.entrarConGoogle());
      if (metodo === 'recuperar') return bugambraAccion(() => bugambraSesion.recuperar(valor('authEmail')));
      if (metodo === 'registro') return bugambraAccion(async () => {
        const r = await bugambraSesion.registrar(valor('authAlias'), valor('authEmail'), valor('authPass'));
        if (r.ok) window.location.hash = '#login';
        return r;
      });
      return bugambraAccion(() => bugambraSesion.entrarConCorreo(valor('authEmail'), valor('authPass')));
    };
`);

// ── Acciones: las conectadas escriben con los servicios de la app; el resto lleva al panel completo ──
cambiar(`    if (typeof fetch === 'function' && window.cargarLiga) {
      cargarLiga(fetch).then(nueva => {`, `    function recargarLiga() {
    if (typeof fetch === 'function' && window.cargarLiga) {
      cargarLiga(fetch).then(nueva => {`);
cambiar(`      }).catch(err => console.warn('Datos en vivo no disponibles, uso la copia:', err.message));
    }
`, `      }).catch(err => console.warn('Datos en vivo no disponibles, uso la copia:', err.message));
    }
    }
    recargarLiga();
`);
cambiar("if (pendiente && !anteriorSinProcesar) { g.economiaProcesada = true; showToast(`GP ${g.n} procesado (prototipo: no se guarda).`); renderApp(); }",
  "if (pendiente && !anteriorSinProcesar) bugambraAccion(() => bugambraAcciones.procesarEconomia({ splitId: t.id, n: g.n }));");
cambiar("<strong>${state.temporada.ventanaFichajes ? 'Abierta' : 'Cerrada'}</strong>", "<strong>${mercadoAbierto() ? 'Abierta' : 'Cerrada'}</strong>");
cambiar(`onclick="state.temporada.ventanaFichajes=!state.temporada.ventanaFichajes;renderApp();">Alternar`, `onclick="bugambraAlternarMercado()">\${mercadoAbierto() ? 'Cerrar' : 'Abrir'}`);
cambiar(`onclick="state.temporada.subastaEnVivo=!state.temporada.subastaEnVivo;renderApp();"`, `onclick="bugambraAlternarSubasta()"`);
cambiar(`onclick="openMoneyConfirmModal({titulo:'Iniciar temporada',resumen:'Se iniciará una nueva temporada.',onConfirm:()=>showToast('Temporada iniciada')})"`, `onclick="bugambraComenzarSplit()"`);
cambiar(`onclick="state.mercado.estado=state.mercado.estado==='Abierto'?'Cerrado':'Abierto';renderApp();"`, `onclick="bugambraAlternarMercado()"`);
cambiar(`onclick="state.mercado.modo=state.mercado.modo==='Sala de pujas'?'Fichaje directo':'Sala de pujas';renderApp();"`, `onclick="bugambraPendiente('Cambiar el modo del mercado')"`);
cambiar(" En el prototipo los cambios no se guardan en la liga.", "");
cambiar(`onclick="showToast('Logo actualizado')"`, `onclick="bugambraCambiarLogo()"`);
cambiar(`onsubmit="event.preventDefault();showToast('Prototipo: el alta no se guarda.');state.ui.adminAltaAbierta=false;renderApp();"`, `onsubmit="event.preventDefault();bugambraFicharAlta()"`);
cambiar(`onclick="showToast('En la web real, aquí se fija el presupuesto inicial.')"`, `onclick="bugambraPresupuestoInicial('\${r.id}')"`);
cambiar(`onclick="showToast('En la web real, aquí se descarga el boletín FIA en PDF.')"`, `onclick="bugambraPendiente('Descargar el boletín FIA en PDF')"`);
// Acta y FIA: el estado del acta y las decisiones salen de Firestore; se puede guardar sin cerrar.
cambiar("disputada: !!c.completado, res };", "disputada: !!c.completado, actaCerrada: !!c.acta_cerrada, hotlap: c.hotlap_url || null, nombreGuardado: c.nombre, fia: (c.decisiones_fia || []).map(d => ({ piloto: d.pilotoId ? slug(d.pilotoId) : null, motivo: d.motivo, efecto: d.efecto_deportivo || d.tipo })), res };");
cambiar("actaEstado: disputada ? 'Acta cerrada por la FIA' :", "actaEstado: disputada ? (g.actaCerrada ? 'Acta cerrada' : 'Resultados guardados · acta abierta') :");
cambiar(`          resultadosDetalle: detalle,
          decisionesFia: []`, `          resultadosDetalle: detalle,
          decisionesFia: (g.fia || []).map(d => ({ ...d, piloto: d.piloto ? nombre(d.piloto) : 'Escudería' }))`);
cambiar("<strong>${d.piloto}</strong> · Multa: <strong>${d.multa}</strong>", "<strong>${d.piloto}</strong>${d.multa ? ` · Multa: <strong>${d.multa}</strong>` : ''}");
cambiar(`<button type="button" class="btn btn-primary" onclick="confirmarCerrarActaAdmin(\${c.orden})">`, `<button type="button" class="btn btn-secondary" onclick="guardarActaAdmin(\${c.orden})">Guardar resultados sin cerrar</button>
              <button type="button" class="btn btn-primary" onclick="confirmarCerrarActaAdmin(\${c.orden})">`);
// Directo en el inicio y la portada; programación y vuelta rápida del GP; cada vista abre el GP que toca.
cambiar(`        <div class="kpi-grid">
          <article class="kpi-card">
            <span class="kpi-label">Próximo GP · \${etiquetaGp(ev)}</span>`, `        \${bloqueDirecto()}\${bloqueCarreraInicio()}
        <div class="kpi-grid">
          <article class="kpi-card">
            <span class="kpi-label">Próximo GP · \${etiquetaGp(ev)}</span>`);
cambiar("main.innerHTML = `${renderHeroPortada()}${renderPortadaTabs()}${tabContent}`;", "main.innerHTML = `${renderHeroPortada()}${bloqueDirecto()}${renderPortadaTabs()}${tabContent}`;");
cambiar("adminCarreraOrden: 14,", "adminCarreraOrden: null,");
// El admin abre el GP activo (el próximo por disputar): el que se programa y, la noche de la carrera, el del acta.
cambiar("if (ultima) { state.ui.selectedCarreraOrden = ultima.n; state.ui.adminCarreraOrden = ultima.n; }", "if (ultima) state.ui.selectedCarreraOrden = ultima.n;");
cambiar("selectedCarreraOrden: 14,", "selectedCarreraOrden: null,");
cambiar("const c = state.carreras.find(x => x.orden === Number(state.ui.adminCarreraOrden)) || state.carreras[2];", "const c = state.carreras.find(x => x.orden === Number(state.ui.adminCarreraOrden)) || state.carreras.find(x => x.estado === 'Próxima') || state.carreras[0];");
cambiar("const cSel = state.carreras.find(c => c.orden === Number(state.ui.selectedCarreraOrden)) || state.carreras[2];", "const cSel = state.carreras.find(c => c.orden === Number(state.ui.selectedCarreraOrden)) || [...state.carreras].reverse().find(c => c.estado === 'Disputada') || state.carreras[0];");
cambiar('<div style="margin-bottom:var(--sp-4);">${renderActaResultados(c.orden)}</div>', '${renderProgramacionAdmin(c.orden)}\n          ${botonReabrirActa(c.orden)}\n          <div style="margin-bottom:var(--sp-4);">${renderActaResultados(c.orden)}</div>');
cambiar(`              <div class="clean-table-panel">
                <h3 class="section-title" style="margin-bottom:var(--sp-2);">Decisiones FIA</h3>`, `              \${renderVueltaRapida(cSel.orden)}
              <div class="clean-table-panel">
                <h3 class="section-title" style="margin-bottom:var(--sp-2);">Decisiones FIA</h3>`);
// Lo que quedaba de ejemplo: subasta en vivo y aviso reales; «Subir cláusula» del jeque no es una regla de la liga.
cambiar("<strong>${state.temporada.subastaEnVivo ? 'Activa' : 'Pausada'}</strong>", "<strong>${temporadaActual().subastaEnVivo ? 'Activa' : 'Pausada'}</strong>");
cambiar(">Iniciar temporada</button>", ">Comenzar el split</button>");
cambiar("      const ultimoAviso = state.avisos[0];\n      const showSaldo", "      const ultimoAviso = avisoInicio();\n      const showSaldo");
cambiar(/\n *<button type="button" class="btn btn-secondary" style="width:100%;margin-top:var\(--sp-2\);" onclick="solicitarSubirClausulaJeque\('\$\{p\.id\}'\)">[\s\S]*?<\/button>/, "");
// Acta cerrada: aviso y «Reabrir acta» en el resumen, para que un cambio no se pierda sin avisar.
// Decisión FIA ligada al acta: piloto de la parrilla, efecto con un toque, multa opcional.
cambiar(/<form class="clean-table-panel" onsubmit="event\.preventDefault\(\); agregarDecisionFiaAdmin\(\$\{c\.orden\}\);"[\s\S]*?<\/form>/, '${renderFormFia(c.orden)}');
cambiar("    window.addEventListener('DOMContentLoaded', () => {", readFileSync(new URL("tool/prototipo-acciones.js", raiz), "utf8") + "    window.addEventListener('DOMContentLoaded', () => {");

writeFileSync(salida, html);
