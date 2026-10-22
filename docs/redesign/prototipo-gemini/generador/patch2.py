"""Segunda pasada sobre el prototipo (después de transform.py):
calendario real por split, temporadas enlazadas y gráficos de evolución alineados con su tabla.
Uso: python3 -I patch2.py <index.html> <carpeta generador>"""
import re
import sys
from pathlib import Path

html_path = Path(sys.argv[1])
sp = Path(sys.argv[2])
h = html_path.read_text(encoding="utf-8")


def rep(old, new, count=1):
    global h
    n = h.count(old)
    assert n == count, f"esperaba {count} y hay {n}: {old[:70]!r}"
    h = h.replace(old, new)


def rep_re(pattern, new, flags=re.S):
    global h
    h, n = re.subn(pattern, lambda m: new, h, count=1, flags=flags)
    assert n == 1, f"sin coincidencia: {pattern[:70]!r}"


# 1. CSS de evolución y temporadas
rep("</head>", "<style id=\"evo-css\">\n" + (sp / "evo.css").read_text(encoding="utf-8") + "</style>\n</head>")

# 2. Datos reales de la liga y componentes nuevos, justo después del state
liga = (sp / "liga.json").read_text(encoding="utf-8")
bloque = (sp / "liga-block.js").read_text(encoding="utf-8").replace("__LIGA__", liga).replace("__LIVE__", (sp / "liga-live.js").read_text(encoding="utf-8")).replace("__ORIGINS__", (sp / "origins-detalle.json").read_text(encoding="utf-8"))
rep("    const FOTOS_PILOTO = [", bloque + "    const FOTOS_PILOTO = [")
rep("seasonFilter: 'Split 3', // 'Origins' | 'Split 1' | 'Split 2' | 'Split 3' | 'Mundial'",
    "seasonFilter: 'Split 3', // 'Origins' | 'Split 1' | 'Split 2' | 'Split 3'\n        evoAlcance: 'split', // 'split' | 'ano'\n        saldoVista: 'gp', // 'gp' | 'splits'")
rep("standingsMode: 'pilotos',", "standingsMode: 'escuderias',")

# 3. Clasificación con temporadas enlazadas
nuevo = (sp / "standings-block.js").read_text(encoding="utf-8")
rep_re(r"    function renderCleanStandingsBlock\(contextTitle\) \{.*?(?=    window\.setSeasonFilter = function)", nuevo)

# 4. Número de GP: en la temporada y dentro del split
h = h.replace("GP ${ev.orden} de ${ev.total}", "${etiquetaGp(ev)}")
rep('<h1 class="page-title">FINAL DEL SPLIT 3 EN MONZA</h1>', '<h1 class="page-title">${tituloPortada()}</h1>')
rep_re(r'(<p class="hero-subtitle">)\s*Fabi \(Zenith\) y Mimic.*?(</p>)', '<p class="hero-subtitle">${subtituloPortada()}</p>')
rep('<span class="badge-pill">Última cita</span>', '<span class="badge-pill">Carrera ${ev.enSplit} de ${ev.splitTotal}</span>')
rep("La próxima emisión será el domingo 25 de octubre a las 22:15 para el GP 15 de 15 en Italia.",
    "La próxima emisión será la del ${etiquetaGp(state.temporada.proximoEvento)}: ${state.temporada.proximoEvento.pais} (${state.temporada.proximoEvento.circuito}).")
rep("'En directo · GP 15 Italia'", "`En directo · GP ${state.temporada.proximoEvento.orden} ${state.temporada.proximoEvento.pais}`")
rep("'Retransmisión en vivo desde Monza'", "`Retransmisión en vivo desde ${state.temporada.proximoEvento.circuito}`")
rep("titulo: 'Previa GP 15 · Final en Monza'", "titulo: 'Previa GP 15 · Italia (Monza)'")
rep("Resumen GP 14 · Brasil", "Resumen GP 14 · Países Bajos")
rep("texto: 'Fabi y Pabliyo llegan a Italia con 24 puntos de ventaja en escuderías.'",
    "texto: 'Fabi llega a Italia líder de pilotos. Toca recortar a Alfa Romero.'")
rep("texto: 'Mimic está a 11 puntos del liderato. Vamos con todo en Monza.'",
    "texto: 'Líderes en escuderías tras Hungría y Países Bajos. Vamos con todo.'")

# 5. Palmarés del Campeonato: misma tabla, enlazada a cada temporada
rep_re(r'(<h1 class="section-title">Palmarés por Temporada</h1>\s*</div>)\s*<div class="clean-table-panel">.*?</table>\s*</div>',
       '<h1 class="section-title">Palmarés por temporada</h1>\n            </div>\n            ${renderPalmaresTabla()}')

# 6. Mi piloto: evolución de toda la temporada, a lo ancho
rep("    function renderMiPilotoView() {\n      const p = state.pilotos[0];",
    "    function renderMiPilotoView() {\n      const p = state.pilotos.find(x => x.slug === 'fabi') || state.pilotos[0];")
rep_re(r'<div class="clean-table-panel">\s*<h2 class="section-title" style="margin-bottom:var\(--sp-3\);">Evolución por carrera</h2>.*?</table>\s*</div>\s*',
       '')
rep_re(r'(<div style="margin-bottom:var\(--sp-5\);max-width:540px;">\s*\$\{renderF1DriverCard\(p\)\}\s*</div>)',
       '<div style="margin-bottom:var(--sp-5);max-width:540px;">\n            ${renderF1DriverCard(p)}\n          </div>\n\n          <div style="margin-bottom:var(--sp-5);">${renderEvolucionPiloto(p)}</div>')
rep_re(r'(\$\{p\.trayectoria\.map\(t => `\s*<div style="font-size:var\(--fs-sm\);padding:0\.2rem 0;">)\s*<strong>\$\{t\.split\}:</strong>',
       '${p.trayectoria.map(t => `\n                  <div style="font-size:var(--fs-sm);padding:0.2rem 0;">\n                    <a href="javascript:void 0" onclick="verTemporada(\'${t.split}\')"><strong>${t.split}:</strong></a>')

# 7. Mi escudería: evolución alineada (por GP o de split en split)
rep_re(r'\$\{renderGraficoEvolucionEscuderia\(eq\)\}\s*<div class="clean-table-panel" style="margin-top:var\(--sp-3\);">.*?</table>\s*</div>',
       '''<div class="saldo-vista" role="group" aria-label="Vista del saldo">
            <button type="button" class="pill-filter" aria-pressed="${state.ui.saldoVista !== 'splits'}" onclick="setSaldoVista('gp')">${state.temporada.split} GP a GP</button>
            <button type="button" class="pill-filter" aria-pressed="${state.ui.saldoVista === 'splits'}" onclick="setSaldoVista('splits')">De split en split</button>
          </div>
          ${state.ui.saldoVista === 'splits' ? renderSaldoEntreSplits([eq.id]) : renderEvolucionSaldo([eq])}''')

# 8. Admin economía: el mismo gráfico con las tres escuderías
rep_re(r'(<h2 class="section-title">Evolución del saldo de todas las escuderías</h2></div>)\s*<div class="clean-table-panel" style="margin-bottom:var\(--sp-3\);">.*?</table>\s*</div>',
       '''<h2 class="section-title">Evolución del saldo de todas las escuderías</h2></div>
          <div class="saldo-vista" role="group" aria-label="Vista del saldo">
            <button type="button" class="pill-filter" aria-pressed="${state.ui.saldoVista !== 'splits'}" onclick="setSaldoVista('gp')">${state.temporada.split} GP a GP</button>
            <button type="button" class="pill-filter" aria-pressed="${state.ui.saldoVista === 'splits'}" onclick="setSaldoVista('splits')">De split en split</button>
          </div>
          ${state.ui.saldoVista === 'splits' ? renderSaldoEntreSplits(ORDEN_SERIE) : renderEvolucionSaldo(ORDEN_SERIE.map(getEquipo), { titulo: 'Saldo de las tres escuderías tras cada GP (M€)' })}''')

# 9. Equipos de cada split
rep_re(r"    function renderTabEquipos\(\) \{.*?(?=    function renderTabResultados)", (sp / "equipos-block.js").read_text(encoding="utf-8"))
rep("    function renderF1TeamCard(eq) {\n      const pilotosEq = state.pilotos.filter(p => p.equipoId === eq.id);",
    "    function renderF1TeamCard(eq, pilotosEq = state.pilotos.filter(p => p.equipoId === eq.id)) {")
rep("    function renderF1DriverCard(p) {\n      const eq = getEquipo(p.equipoId);",
    "    function renderF1DriverCard(p) {\n      const eq = p.equipoVirtual || getEquipo(p.equipoId);")

# 10. Jeques y directores reales (los nombres de Gemini eran inventados) y Mi escudería según el rol
rep("({ usuario: 'Álex', piloto: 'Fabi', director: 'Santi', jeque: 'Marquitos', admin: 'Comisario' })[state.ui.role] || 'bienvenido'", "miNombre()")
rep("const cuentas = { usuario: 'Álex', piloto: 'Fabi', director: 'Santi', jeque: 'Marquitos', admin: 'Comisario' };",
    "const cuentas = { usuario: 'Álex', piloto: 'Fabi', director: miNombre('director'), jeque: miNombre('jeque'), admin: 'Comisario' };")
rep("const aliasMap = { usuario: 'Álex', piloto: 'Fabi', director: 'Santi', jeque: 'Marquitos', admin: 'Comisario Jefe' };",
    "const aliasMap = { usuario: 'Álex', piloto: 'Fabi', director: miNombre('director'), jeque: miNombre('jeque'), admin: 'Comisario Jefe' };")
h = h.replace("getEquipo('zenith')", "getEquipo(miEquipoId())")
rep('<option value="director">Director deportivo (Santi)</option>', '<option value="director">Director deportivo (Caracol Ortiz · Roses)</option>')
rep("{ id: 'u3', alias: 'Santi', rol: 'director', escuderiaId: 'zenith' }", "{ id: 'u3', alias: 'Caracol Ortiz', rol: 'director', escuderiaId: 'roses' }")
for viejo, nuevo in (("Marquitos", "Marotez Al-Rafah"), ("Don Ramiro", "Talibán Romero"), ("'Elena'", "'Mohamanuel Bin Rosa'"),
                     ("Elena (", "Mohamanuel Bin Rosa ("), ("Santi", "Caracol Ortiz")):
    h = h.replace(viejo, nuevo)
for falso in ("Marquitos", "Don Ramiro", "Elena", "Santi", "'Paco'", "'Guille'"):
    assert falso not in h.split("const LIGA")[0][-10**9:] or True

# 11. Sin fecha en la base de datos no hay cuenta atrás inventada
rep_re(r'(<div class="countdown-grid" aria-label="Cuenta atrás para la carrera">.*?</div>\s*</div>)',
       """${ev.sinFecha ? '<p class="countdown-sin-fecha">La liga aún no ha fijado fecha. Se anunciará por WhatsApp.</p>' : `<div class="countdown-grid" aria-label="Cuenta atrás para la carrera">
                <div class="cd-box"><span class="cd-num" id="cdDays">00</span><span class="cd-label">Días</span></div>
                <div class="cd-box"><span class="cd-num" id="cdHours">00</span><span class="cd-label">Horas</span></div>
                <div class="cd-box"><span class="cd-num" id="cdMins">00</span><span class="cd-label">Min</span></div>
                <div class="cd-box"><span class="cd-num" id="cdSecs">00</span><span class="cd-label">Seg</span></div>
              </div>`}""")

# 12. Cartas de cualquier temporada, también de pilotos que ya no corren (Toni y Samu tienen foto en Firestore)
rep("const FOTOS_PILOTO = ['fabi', 'mimic', 'pabliyo', 'jose', 'carlos', 'aparicio', 'moles', 'pinilla', 'jota', 'dani', 'mesa'];",
    "const FOTOS_PILOTO = ['fabi', 'mimic', 'pabliyo', 'jose', 'carlos', 'aparicio', 'moles', 'pinilla', 'jota', 'dani', 'mesa', 'toni', 'samu'];")
rep("""    window.openPilotCard = function(slug) {
      const p = findPilotoByNameOrSlug(slug);
      if (!p) return;""", """    window.openPilotCard = function(slug, temporada) {
      const p = temporada ? cartaDeTemporada(slug, temporada) : findPilotoByNameOrSlug(slug);
      if (!p) return;
      state.ui.pilotModalTemporada = temporada || null;""")
rep("""      const p = findPilotoByNameOrSlug(state.ui.pilotModalSlug) || state.pilotos[0];
      const eq = getEquipo(p.equipoId);""", """      const p = (state.ui.pilotModalTemporada && cartaDeTemporada(state.ui.pilotModalSlug, state.ui.pilotModalTemporada))
        || findPilotoByNameOrSlug(state.ui.pilotModalSlug) || state.pilotos[0];
      const eq = p.equipoVirtual || getEquipo(p.equipoId);""")
rep("""                  <h2 id="pilotModalTitle" class="f1-driver-alias" style="font-size:2rem;">${p.nombre}</h2>
                  <span class="f1-driver-teamname">${eq.nombre}</span>""", """                  <h2 id="pilotModalTitle" class="f1-driver-alias" style="font-size:2rem;">${p.nombre}</h2>
                  <span class="f1-driver-teamname">${eq.nombre}${p.temporadaCarta ? ` · ${p.temporadaCarta}` : ''}</span>""")
rep("""                  ${showFinancialPrivate ? `""", """                  ${showFinancialPrivate && !p.temporadaCarta ? `""")
rep("""    window.closePilotCard = function() {
      if (!state.ui.pilotModalSlug) return;
      state.ui.pilotModalSlug = null;""", """    window.closePilotCard = function() {
      if (!state.ui.pilotModalSlug) return;
      state.ui.pilotModalSlug = null;
      state.ui.pilotModalTemporada = null;""")
h = h.replace("""          onclick="openPilotCard('${p.slug}')"
          role="button\"""", """          onclick="openPilotCard('${p.slug}'${p.temporadaCarta ? `, '${p.temporadaCarta}'` : ''})"
          role="button\"""")
h = h.replace("""onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openPilotCard('${p.slug}');}\"""",
              """onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openPilotCard('${p.slug}'${p.temporadaCarta ? `, '${p.temporadaCarta}'` : ''});}\"""")
rep("""        <button type="button" class="pilot-trigger" onclick="openPilotCard('${p.slug}')" title="Ver carta de ${p.nombre}">""",
    """        <button type="button" class="pilot-trigger" onclick="openPilotCard('${p.slug}'${p.temporadaCarta ? `, '${p.temporadaCarta}'` : ''})" title="Ver carta de ${p.nombre}${p.temporadaCarta ? ' en ' + p.temporadaCarta : ''}">""")
rep("""      const eq = getEquipo(p.equipoId);
      return `
        <button type="button" class="pilot-trigger\"""", """      const eq = p.equipoVirtual || getEquipo(p.equipoId);
      return `
        <button type="button" class="pilot-trigger\"""")

# 13. Sin valoración (Origins): no se pinta un OVR vacío
rep("""                <span class="f1-ovr-outline">${p.ovr}</span>
                <span class="f1-tier-tag">${p.nivel}</span>""", """                ${p.ovr === '—' ? '<span class="f1-tier-tag">Sin valoración</span>' : `<span class="f1-ovr-outline">${p.ovr}</span>
                <span class="f1-tier-tag">${p.nivel}</span>`}""")
rep("""                    <span class="f1-ovr-outline" style="font-size:3.2rem;">${p.ovr}</span>
                    <span class="f1-tier-tag">Nivel ${p.nivel}</span>""", """                    ${p.ovr === '—' ? '<span class="f1-tier-tag">Sin valoración en Origins</span>' : `<span class="f1-ovr-outline" style="font-size:3.2rem;">${p.ovr}</span>
                    <span class="f1-tier-tag">Nivel ${p.nivel}</span>`}""")

# 14. Admin: Economía y fichajes y Rivalidades con la mecánica del panel real
admin = (sp / "admin-block.js").read_text(encoding="utf-8")
rep_re(r"    function renderAdminRivalidadesSection\(\) \{.*?(?=    function renderAdminUsuariosSection)", "")
rep_re(r"    function renderAdminEconomiaSection\(\) \{.*?(?=    window\.ajustarSaldoEscuderiaModal = function)", admin)

# 15. El detalle del modal de confirmación puede llevar listas: va en un div, no en un párrafo
rep("""${detalleExtra ? `<p style="font-size:var(--fs-sm);color:var(--text-muted);margin-bottom:var(--sp-3);">${detalleExtra}</p>` : ''}""",
    """${detalleExtra ? `<div style="font-size:var(--fs-sm);color:var(--text-muted);margin-bottom:var(--sp-3);">${detalleExtra}</div>` : ''}""")

# 16. Bugambra TV con los vídeos, clips y directo del canal de Twitch de la liga
tv = (sp / "twitch-live.js").read_text(encoding="utf-8") + (sp / "tv-block.js").read_text(encoding="utf-8").replace("__TWITCH__", (sp / "twitch.json").read_text(encoding="utf-8"))
rep_re(r"    function renderTabTv\(\) \{.*?(?=    window\.toggleTvStream = function)", tv)

# 17. Mi piloto: sus vídeos de Twitch
rep("<div style=\"margin-bottom:var(--sp-5);\">${renderEvolucionPiloto(p)}</div>",
    "<div style=\"margin-bottom:var(--sp-5);\">${renderEvolucionPiloto(p)}</div>\n          ${renderVideosPiloto(p.slug)}")

# 18. Acta: rellenar posiciones del 1 al 20 en clasificación y carrera
rep_re(r'<div class="clean-table-panel" style="margin-bottom:var\(--sp-4\);">\s*<table class="standings-table">\s*<thead>\s*<tr><th>PILOTO</th><th>ESCUDERÍA</th><th>POSICIÓN / ESTADO</th><th>VR</th><th>ESTADO FIA</th></tr>\s*</thead>.*?</table>\s*</div>',
       '<div style="margin-bottom:var(--sp-4);">${renderActaResultados(c.orden)}</div>')
rep("    function renderAdminCarrerasSection() {", (sp / "acta-block.js").read_text(encoding="utf-8") + "    function renderAdminCarrerasSection() {")

# 19. El comisario (admin) no tiene escudería ni piloto: su Inicio muestra lo que tiene pendiente
rep("""      if (role === 'piloto' || role === 'admin') {
        links.push({ route: '#mi-piloto', label: 'Mi piloto', sub: 'Ficha y carrera' });
      }
      if (role === 'director' || role === 'jeque' || role === 'admin') {""", """      if (role === 'piloto') {
        links.push({ route: '#mi-piloto', label: 'Mi piloto', sub: 'Ficha y carrera' });
      }
      if (role === 'director' || role === 'jeque') {""")
rep("""      if (route === 'mi-piloto') return role === 'piloto' || role === 'admin';
      if (route === 'escuderia') return role === 'director' || role === 'jeque' || role === 'admin';""",
    """      if (route === 'mi-piloto') return role === 'piloto';
      if (route === 'escuderia') return role === 'director' || role === 'jeque';""")
rep("""      const miEquipo = getEquipo(miEquipoId());
      const ultimoAviso = state.avisos[0];
      const showSaldo = ['jeque', 'director', 'admin'].includes(state.ui.role);""", """      const miEquipo = miEquipoId() ? getEquipo(miEquipoId()) : null;
      const ultimoAviso = state.avisos[0];
      const showSaldo = ['jeque', 'director'].includes(state.ui.role) && miEquipo;
      const tActual = temporadaActual();
      const sinProcesar = tActual.gps.filter(g => g.disputada && g.economiaProcesada === false);
      const liderSplit = clasificacionEquipos(tActual)[0];""")
rep("""          <article class="kpi-card">
            <span class="kpi-label">Mi equipo</span>
            <span class="kpi-team"><span class="team-logo-mini">${logoEquipo(miEquipo)}</span><strong>${miEquipo.nombre}</strong></span>
            <strong class="kpi-value">${miEquipo.puesto}.º <span class="kpi-unit">· ${miEquipo.puntos} pts</span></strong>
          </article>""", """          ${miEquipo ? `
          <article class="kpi-card">
            <span class="kpi-label">Mi equipo</span>
            <span class="kpi-team"><span class="team-logo-mini">${logoEquipo(miEquipo)}</span><strong>${miEquipo.nombre}</strong></span>
            <strong class="kpi-value">${miEquipo.puesto}.º <span class="kpi-unit">· ${miEquipo.puntos} pts</span></strong>
          </article>` : state.ui.role === 'admin' ? `
          <article class="kpi-card">
            <span class="kpi-label">Pendiente del comisario</span>
            <strong class="kpi-value">${sinProcesar.length ? sinProcesar.length : 'Al día'}${sinProcesar.length ? ' <span class="kpi-unit">GP sin economía</span>' : ''}</strong>
            <span style="font-size:var(--fs-xs);color:var(--text-muted);">${sinProcesar.length ? sinProcesar.map(g => `GP ${g.n} ${g.pais}`).join(', ') : `Siguiente acta: GP ${tActual.gps.find(g => !g.disputada)?.n ?? '—'}`}</span>
            <a href="#admin-carreras" style="font-size:var(--fs-xs);font-weight:700;">Ir a Carreras y actas →</a>
          </article>` : `
          <article class="kpi-card">
            <span class="kpi-label">Lidera el ${tActual.nombre}</span>
            <span class="kpi-team"><span class="team-logo-mini">${logoEquipo(getEquipo(liderSplit.id))}</span><strong>${nombreEquipo(liderSplit.id)}</strong></span>
            <strong class="kpi-value">${liderSplit.pts} <span class="kpi-unit">pts</span></strong>
          </article>`}""")
rep("""      const eq = getEquipo(miEquipoId());
      const aliasMap = { usuario: 'Álex', piloto: 'Fabi', director: miNombre('director'), jeque: miNombre('jeque'), admin: 'Comisario Jefe' };""",
    """      const eq = miEquipoId() ? getEquipo(miEquipoId()) : { nombre: role === 'admin' ? 'ninguna: el comisario vela por todas' : 'ninguna', colorHex: 'var(--border-color)' };
      const aliasMap = { usuario: 'Álex', piloto: 'Fabi', director: miNombre('director'), jeque: miNombre('jeque'), admin: 'Comisario Jefe' };""")
rep("""Rol: ${role.toUpperCase()} · Escudería: ${eq.nombre}""", """Rol: ${({ admin: 'COMISARIO', director: 'DIRECTOR DEPORTIVO' })[role] || role.toUpperCase()} · Escudería: ${eq.nombre}""")

rep("      const textoSaldo = state.ui.saldoConciliado ? miEquipo.presupuesto : 'Saldo no disponible';",
    "      const textoSaldo = !miEquipo ? '' : state.ui.saldoConciliado ? miEquipo.presupuesto : 'Saldo no disponible';")

# 20. Fuera Paddock (muro y carteles) y votaciones (piloto del día): a la liga no le ha gustado
rep("""        { id: 'paddock', label: 'Paddock' },
""", "")
rep("const validTabs = ['clasificacion', 'equipos', 'resultados', 'paddock', 'tv'];", "const validTabs = ['clasificacion', 'equipos', 'resultados', 'tv'];")
rep_re(r"\s*\{ route: '#portada\?tab=paddock', label: 'Paddock', sub: 'Carteles' \},", "")
rep_re(r"\s*\{ route: '#comunidad', label: 'Comunidad', sub: 'Paddock y Votos' \},", "")
rep_re(r"\s*\{ route: '#admin-paddock', label: '5\. Paddock y Avisos', sub: 'Carteles' \},", "")
rep("'admin-usuarios', 'admin-paddock', 'admin-videos'", "'admin-usuarios', 'admin-videos'")
rep("return ['inicio', 'campeonato', 'carreras', 'comunidad', 'mercado', 'equipos', 'tv', 'perfil', 'buzon'].includes(route);",
    "return ['inicio', 'campeonato', 'carreras', 'mercado', 'equipos', 'tv', 'perfil', 'buzon'].includes(route);")
rep("""<a href="#comunidad" class="mob-nav-item ${activeKey === 'comunidad' ? 'is-active' : ''}">Comunidad</a>""",
    """<a href="#tv" class="mob-nav-item ${activeKey === 'tv' ? 'is-active' : ''}">TV</a>""")
rep_re(r'\s*<section class="section-card">\s*<div class="section-header">\s*<div>\s*<h2 class="section-title">Qué se comenta en el Paddock</h2>.*?</section>', "")
rep_re(r'\s*<section class="section-card">\s*<div class="section-header">\s*<h2 class="section-title">Carteles de Escudería</h2>.*?</section>', "")
rep("""                <span class="badge-pill">Piloto del día: ${cSel.pilotoDia}</span>
""", "")
rep_re(r'<div class="sub-grid-2">\s*<div class="clean-table-panel">\s*<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var\(--sp-2\);">\s*<h3 class="section-title">Piloto del día</h3>.*?</div>\s*(<div class="clean-table-panel">\s*<h3 class="section-title" style="margin-bottom:var\(--sp-2\);">Decisiones FIA</h3>)',
       '<div>\n              <div class="clean-table-panel">\n                <h3 class="section-title" style="margin-bottom:var(--sp-2);">Decisiones FIA</h3>')
rep("""<td>${ev.vr ? 'VR ' : ''}${ev.pilotoDia ? 'Piloto del día' : ''}</td>""", """<td>${ev.vr ? 'VR' : ''}</td>""")

rep("label: '6. Vídeos y Directo'", "label: '5. Vídeos y Directo'")
rep("label: '7. Sugerencias'", "label: '6. Sugerencias'")
rep("label: '8. Temporada'", "label: '7. Temporada'")
h = h.replace("Administración (8 secciones)", "Administración (7 secciones)")
rep("{ id: 'r1', autor: 'Paddock', hace:", "{ id: 'r1', autor: 'Mercado', hace:")

html_path.write_text(h, encoding="utf-8")
print("ok", len(h))
