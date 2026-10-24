"""Aplica el pulido al prototipo de Gemini: fotos y logos reales, cabecera y capa de estilo."""
import re
import sys

path = sys.argv[1]
src = open(path, encoding="utf-8").read()


def rep(old, new, count=1):
    global src
    n = src.count(old)
    if n < 1 or (count and n != count):
        raise SystemExit(f"esperaba {count} y hay {n}: {old[:80]!r}")
    src = src.replace(old, new)


# ── 1. Pilotos y escuderías reales (nombres; cifras siguen siendo de ejemplo) ──
head, data = src.split("<script>", 1)
# Orden importante: el Dani ficticio de Roses pasa a Aparicio antes de que Sergio pase a Dani.
renames = [
    ("Aitor", "Mimic"), ("aitor", "mimic"),
    ("Rubén", "Pabliyo"), ("ruben", "pabliyo"),
    ("Nacho", "Jose"), ("nacho", "jose"),
    ("Dani", "Aparicio"), ("dani", "aparicio"),
    ("Kiko", "Moles"), ("kiko", "moles"),
    ("Manu", "Pinilla"), ("manu", "pinilla"),
    ("Javi", "Jota"), ("javi", "jota"),
    ("Sergio", "Dani"), ("sergio", "dani"),
    ("Iván", "Mesa"), ("ivan", "mesa"),
]
for a, b in renames:
    data = re.sub(rf"(?<![\wÁÉÍÓÚáéíóúñ]){a}(?![\wÁÉÍÓÚáéíóúñ])", b, data)
# Los nombres de pila inventados no existen en la liga: fuera.
data = re.sub(r"nombrePila: '[^']*'", "nombrePila: ''", data)
# Colores reales de las escuderías, también en los gráficos.
data = data.replace("#0369a1", "#b8902f").replace("#991b1b", "#5b8ad6").replace("#9d174d", "#e0307a")
src = head + "<script>" + data

# Textos de portada que nombraban al ficticio Aitor fuera del estado.
src = src.replace("Fabi (Zenith) y Aitor (Alfa Romero)", "Fabi (Zenith) y Mimic (Alfa Romero)")
src = re.sub(r"(?<![\w])Aitor(?![\w])", "Mimic", src)

# ── 2. Fotos y logos ──
rep("""    function renderDriverCutoutSvg(piloto, eq) {""", """    const FOTOS_PILOTO = ['fabi', 'mimic', 'pabliyo', 'jose', 'carlos', 'aparicio', 'moles', 'pinilla', 'jota', 'dani', 'mesa'];
    const LOGOS_EQUIPO = { zenith: 'img/logo-zenith.jpg', alfa: 'img/logo-alfa-romero.jpg', roses: 'img/logo-roses.jpg' };

    function fotoPiloto(p) {
      return p && FOTOS_PILOTO.includes(p.slug) ? `img/piloto-${p.slug}.jpg` : null;
    }

    /** Avatar redondo: foto si existe, iniciales si no. */
    function avatarPiloto(p) {
      const foto = fotoPiloto(p);
      return foto ? `<img src="${foto}" alt="">` : p.nombre.slice(0, 2).toUpperCase();
    }

    function logoEquipo(eq) {
      const logo = eq && LOGOS_EQUIPO[eq.id];
      return logo ? `<img src="${logo}" alt="">` : (eq ? eq.siglas : '');
    }

    function renderDriverCutoutSvg(piloto, eq) {
      const foto = fotoPiloto(piloto);
      if (foto) return `<img class="f1-driver-photo" src="${foto}" alt="">`;""")

rep("""<span class="f1-team-logo-circle" title="Escudería ${eq.nombre}">${eq.siglas}</span>""",
    """<span class="f1-team-logo-circle" title="Escudería ${eq.nombre}">${logoEquipo(eq)}</span>""")
rep("""<span class="f1-team-logo-circle">${eq.siglas}</span>""",
    """<span class="f1-team-logo-circle">${logoEquipo(eq)}</span>""", count=2)
rep("""<span class="f1-mini-avatar">${p.nombre.slice(0, 2).toUpperCase()}</span>""",
    """<span class="f1-mini-avatar">${avatarPiloto(p)}</span>""")
rep("""<span class="team-logo-mini" style="background-color:${eq.colorHex};">${eq.siglas}</span>""",
    """<span class="team-logo-mini">${logoEquipo(eq)}</span>""")
rep("""<span class="team-logo-mini" style="background-color:${e.colorHex};">${e.siglas}</span>""",
    """<span class="team-logo-mini">${logoEquipo(e)}</span>""")
rep("""<span class="driver-avatar" style="border-color:${eq.colorHex};">${p.nombre.slice(0, 2).toUpperCase()}</span>""",
    """<span class="driver-avatar" style="border-color:${eq.colorHex};">${avatarPiloto(p)}</span>""")
# La carta de piloto: nombre de pila solo si existe.
rep("""<span class="f1-driver-firstname">${p.nombrePila || p.nombre}</span>""",
    """${p.nombrePila ? `<span class="f1-driver-firstname">${p.nombrePila}</span>` : ''}""", count=2)
rep("""<span>${p.nombrePila || p.nombre} <strong>${p.nombre.toUpperCase()}</strong></span>""",
    """<span><strong>${p.nombre}</strong></span>""")

# Podio: el puesto dentro de un círculo, igual para 1.º, 2.º y 3.º.
rep("""                          <span>${pos}</span>
                          ${isPodio ? `<span class="podium-marker" title="Puesto de podio">P</span>` : ''}""",
    """                          <span class="${isPodio ? 'pos-podium' : ''}" ${isPodio ? 'title="Puesto de podio"' : ''}>${pos}</span>""")


# Tarjeta de escudería: la mitad inferior enseña a sus pilotos, no un texto.
rep("""            <div class="f1-team-poster-bleed">
              <div style="font-size:var(--fs-xs);text-transform:uppercase;letter-spacing:0.08em;opacity:0.85;margin-bottom:0.25rem;">
                Cartel de escudería · ${state.temporada.split}
              </div>
              <p style="font-size:var(--fs-sm);font-weight:700;line-height:1.35;">
                ${eq.lemaCartel}
              </p>
            </div>""",
    """            <div class="f1-team-poster-bleed">
              <div class="team-lineup">
                ${pilotosEq.map(p => fotoPiloto(p) ? `<img src="${fotoPiloto(p)}" alt="${p.nombre}">` : '').join('')}
              </div>
            </div>""")
rep("""            <div class="f1-team-Bottom-strip">
              <span>Constructores: ${eq.puntos} PTS (${eq.puesto}.º)</span>
              <span>Media OVR ${eq.mediaOvr}</span>""",
    """            <div class="f1-team-Bottom-strip">
              <span>${eq.puesto}.º · ${eq.puntos} pts</span>
              <span>Media OVR ${eq.mediaOvr}</span>""")
# Carteles del paddock con el logo de la escudería.
rep("""                <div class="poster-banner ${eq.surfaceClass}">""",
    """                <div class="poster-banner ${av.oficialFia ? 'fia-surface' : eq.surfaceClass}">
                  ${av.oficialFia ? '' : `<span class="poster-logo">${logoEquipo(eq)}</span>`}""")

# ── 3. Cabecera: icono de menú, tema con icono, directo solo si hay ──
rep("""        <button type="button" id="openMenuBtn" class="icon-btn" aria-label="Abrir menú lateral" aria-expanded="false">
          Menú
        </button>""",
    """        <button type="button" id="openMenuBtn" class="icon-btn menu-btn" aria-label="Abrir menú" aria-expanded="false">
          <span class="burger" aria-hidden="true"><span></span><span></span><span></span></span>
        </button>""")
rep("""        <button type="button" id="closeMenuBtn" class="icon-btn" aria-label="Cerrar menú lateral">
          Cerrar
        </button>""",
    """        <button type="button" id="closeMenuBtn" class="icon-btn menu-btn" aria-label="Cerrar menú">
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        </button>""")
rep("""          <span class="brand-mark">F1</span>
          <span>Bugambra · Split 3</span>""",
    """          <span class="brand-mark">F1</span>
          <span>Bugambra</span>""")
rep("""        <button type="button" id="themeToggleBtn" class="icon-btn" aria-label="Cambiar entre tema oscuro y claro">
          <span id="themeLabel">Tema claro</span>
        </button>""",
    """        <button type="button" id="themeToggleBtn" class="icon-btn menu-btn" aria-label="Cambiar entre tema oscuro y claro">
          <span id="themeLabel" class="theme-icon" aria-hidden="true"></span>
        </button>""")
rep("""        document.getElementById('themeLabel').textContent = state.ui.theme === 'dark' ? 'Tema claro' : 'Tema oscuro';\n""", "")

# Botón de cuenta: «Entrar» para invitados, avatar y nombre con sesión.
rep("""      const menuLinks = getMenuLinksForRole(role);""",
    """      const authBtn = document.getElementById('headerAuthBtn');
      const cuentas = { usuario: 'Álex', piloto: 'Fabi', director: 'Santi', jeque: 'Marquitos', admin: 'Comisario' };
      if (isGuest) {
        authBtn.className = 'btn btn-primary btn-sm';
        authBtn.href = '#login';
        authBtn.innerHTML = 'Entrar';
      } else {
        const nombre = cuentas[role] || 'Mi cuenta';
        const foto = role === 'piloto' ? fotoPiloto(state.pilotos.find(p => p.slug === 'fabi')) : null;
        authBtn.className = 'account-btn';
        authBtn.href = '#perfil';
        authBtn.innerHTML = `<span class="account-avatar">${foto ? `<img src="${foto}" alt="">` : nombre.slice(0, 1)}</span><span class="account-name">${nombre}</span>`;
      }

      const menuLinks = getMenuLinksForRole(role);""")

# El aviso de rol era ruido de prototipo.
rep("""        showToast(`Rol activo: ${state.ui.role.toUpperCase()}`);\n""", "")

# ── 4. Inicio: saludo en vez de «Inicio · Rol: X» ──
rep("""            <span class="badge-pill badge-split">${state.temporada.split}</span>
            <h1>Inicio · Rol: ${state.ui.role.toUpperCase()}</h1>""",
    """            <span class="eyebrow">${state.temporada.split} · GP ${ev.orden} de ${ev.total}</span>
            <h1>Hola, ${({ usuario: 'Álex', piloto: 'Fabi', director: 'Santi', jeque: 'Marquitos', admin: 'Comisario' })[state.ui.role] || 'bienvenido'}</h1>""")

# Portada: menos chapas y sin el texto de ayuda de las pestañas.
rep("""            <span class="badge-pill">3 escuderías · 11 pilotos</span>\n""", "")
rep("""            <span>Secciones de portada</span>
            <span>Desliza para ver más opciones →</span>""",
    """            <span></span>
            <span class="only-mobile">Desliza →</span>""")


# Inicio: «Mi equipo» con logo, puesto y puntos legibles.
rep("""            <span class="kpi-label">Mi equipo</span>
            <strong style="font-size:var(--fs-lg);">${miEquipo.nombre} (${miEquipo.puesto}.º)</strong>
            <span class="pts-strong" data-count-key="ini_eq_pts" data-count="${miEquipo.puntos}">${miEquipo.puntos} PTS</span>""",
    """            <span class="kpi-label">Mi equipo</span>
            <span class="kpi-team"><span class="team-logo-mini">${logoEquipo(miEquipo)}</span><strong>${miEquipo.nombre}</strong></span>
            <strong class="kpi-value">${miEquipo.puesto}.º <span class="kpi-unit">· ${miEquipo.puntos} pts</span></strong>""")

# ── 5. Tipografía y capa de estilo ──
rep("""  <style>""", """  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Titillium+Web:wght@400;600;700;900&display=swap" rel="stylesheet">
  <style>""")
overlay = open(sys.argv[2], encoding="utf-8").read()
rep("""  </style>
</head>""", overlay + "\n  </style>\n</head>")

open(path, "w", encoding="utf-8").write(src)
print("ok")
