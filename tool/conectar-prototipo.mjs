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
`);
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
      const trayectoria = (miPiloto() || {}).trayectoria || [];`);
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

writeFileSync(salida, html);
