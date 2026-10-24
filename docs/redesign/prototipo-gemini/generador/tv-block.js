    /* ==========================================================================
       BUGAMBRA TV: directo, vídeos y clips del canal de Twitch de la liga (tonicotitular).
       Se piden al abrir la página; si Twitch no responde, se usa una copia.
       ========================================================================== */
    const TWITCH = __TWITCH__;
    state.ui.tvOrigen = 'copia';
    state.ui.tvStreamActive = !!TWITCH.enDirecto;
    if (typeof fetch === 'function' && window.cargarTwitch) {
      cargarTwitch(fetch).then(t => {
        Object.assign(TWITCH, t);
        state.ui.tvOrigen = 'vivo';
        state.ui.tvStreamActive = !!t.enDirecto;
        updateHeaderAndDrawer();
        renderApp();
      }).catch(err => console.warn('Twitch no disponible, uso la copia:', err.message));
    }

    const duracionTexto = (s) => {
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
      return h ? `${h} h ${String(m).padStart(2, '0')} min` : m ? `${m}:${String(sec).padStart(2, '0')}` : `${sec} s`;
    };
    const padreTwitch = () => location.hostname || '';

    function reproductorTwitch(item) {
      const padre = padreTwitch();
      const src = item.slug
        ? `https://clips.twitch.tv/embed?clip=${item.slug}&parent=${padre}&autoplay=true`
        : item.directo
          ? `https://player.twitch.tv/?channel=${item.canal}&parent=${padre}&autoplay=true`
          : `https://player.twitch.tv/?video=v${item.id}&parent=${padre}&autoplay=true`;
      const enlace = item.slug ? `https://clips.twitch.tv/${item.slug}` : item.directo ? `https://www.twitch.tv/${item.canal}` : `https://www.twitch.tv/videos/${item.id}`;
      return padre
        ? `<div class="tv-player"><iframe src="${src}" title="${item.titulo || 'Directo'}" allowfullscreen loading="lazy"></iframe></div>`
        : `<p class="evo-nota">Abre el prototipo desde su enlace para ver el vídeo aquí, o <a href="${enlace}" target="_blank" rel="noopener">míralo en Twitch</a>.</p>`;
    }

    // Qué GP es cada vídeo: por el nombre del circuito o del país en el título.
    const ALIAS_GP = { holanda: 'Países Bajos', zandvoort: 'Países Bajos', zanvoort: 'Países Bajos', hungria: 'Hungría', monza: 'Italia', imola: 'Italia',
      silverstone: 'Gran Bretaña', belgium: 'Bélgica', spa: 'Bélgica', bcn: 'España', barcelona: 'España', monaco: 'Mónaco', canada: 'Canadá' };
    const normal = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const dias = (a, b) => Math.abs(new Date(a) - new Date(b)) / 864e5;
    function candidatosGp(v) {
      const t = normal(v.titulo);
      const clave = Object.keys(ALIAS_GP).find(k => new RegExp(`\\b${k}\\b`).test(t));
      if (!clave) return [];
      const circuito = clave === 'imola' ? 'Imola' : clave === 'monza' ? 'Monza' : null;
      return LIGA.flatMap(s => s.gps.map(g => ({ ...g, split: s.nombre })))
        .filter(g => g.pais === ALIAS_GP[clave] && g.disputada && (!circuito || g.circuito === circuito));
    }
    /** GP de un vídeo solo cuando no hay duda: un único candidato, una fecha cercana o, si el circuito se
        corrió en varias temporadas, la temporada de otro vídeo inequívoco de esos mismos días. */
    function gpDeVideo(v) {
      const cand = candidatosGp(v);
      if (!cand.length) return null;
      const fechados = cand.filter(g => g.fecha && dias(g.fecha, v.fecha) <= 21).sort((a, b) => dias(a.fecha, v.fecha) - dias(b.fecha, v.fecha));
      if (fechados.length) return fechados[0];
      if (cand.length === 1) return cand[0];
      const vecinos = [...TWITCH.videos, ...TWITCH.clips]
        .filter(o => o !== v && dias(o.fecha, v.fecha) <= 7)
        .map(o => candidatosGp(o)).filter(c => c.length === 1).map(c => c[0].split);
      const enTemporada = cand.filter(g => vecinos.includes(g.split));
      return enTemporada.length === 1 ? enTemporada[0] : null;
    }

    /** Vídeos de un piloto (su canal), cada uno con su GP y lo que hizo en esa carrera. */
    function renderVideosPiloto(slug) {
      const canal = (TWITCH.canales || []).find(c => c.piloto === slug);
      if (!canal) return '';
      const propios = [...TWITCH.videos, ...TWITCH.clips].filter(v => v.piloto === slug);
      return `
        <div class="videos-piloto">
          <div class="section-header">
            <h2 class="section-title">Sus vídeos en Twitch</h2>
            <a class="btn btn-secondary" href="https://www.twitch.tv/${canal.login}/videos" target="_blank" rel="noopener">${canal.login}</a>
          </div>
          ${canal.enDirecto ? `<p class="badge-pill badge-split">En directo ahora · ${canal.enDirecto.titulo}</p>` : ''}
          <div class="tv-grid">${propios.map(tarjetaVideo).join('') || '<p class="evo-nota">No hay vídeos guardados en su canal.</p>'}</div>
        </div>`;
    }

    function tarjetaVideo(v) {
      const clave = v.slug || v.id;
      const abierto = state.ui.tvVideoAbierto === clave;
      const g = gpDeVideo(v);
      const res = g && v.piloto && g.res[v.piloto];
      return `
        <article class="tv-card ${abierto ? 'is-open' : ''}">
          ${abierto ? reproductorTwitch(v) : `
            <button type="button" class="tv-thumb" onclick="abrirVideoTv('${clave}')" aria-label="Ver ${v.titulo.replace(/"/g, '')}">
              <img src="${v.miniatura}" alt="" loading="lazy">
              <span class="tv-dur">${duracionTexto(v.segundos)}</span>
              <span class="tv-play" aria-hidden="true">▶</span>
            </button>`}
          <div class="tv-meta">
            <span class="tv-tipo tv-tipo--${v.tipo.toLowerCase()}">${v.tipo}${v.piloto ? ' · cámara de ' + v.autor : ''}</span>
            <h4>${v.titulo}</h4>
            <small>${g ? `GP ${g.n} · ${g.pais} (${g.split})${res ? ` · ${posTexto(res.pos)}, ${res.pts} pts` : ''} · ` : (v.split ? v.split + ' · ' : '')}${fechaCorta(v.fecha)} · ${v.vistas} visualizaciones</small>
          </div>
        </article>`;
    }

    window.setTvCanal = function(c) { state.ui.tvCanal = c; renderApp(); };
    window.setTvFiltro = function(f) { state.ui.tvFiltro = f; renderApp(); };
    window.abrirVideoTv = function(clave) { state.ui.tvVideoAbierto = state.ui.tvVideoAbierto === clave ? null : clave; renderApp(); };

    function renderTabTv() {
      const filtro = state.ui.tvFiltro || 'todo';
      const canalSel = state.ui.tvCanal || 'todos';
      const todos = [...TWITCH.videos, ...TWITCH.clips].filter(v => canalSel === 'todos' || v.canal === canalSel);
      const lista = todos.filter(v => filtro === 'todo' ? true
        : filtro === 'entrevistas' ? v.tipo === 'Entrevista'
        : filtro === 'carreras' ? v.tipo === 'Carrera'
        : filtro === 'clips' ? v.tipo === 'Clip' : v.tipo === 'Directo');
      const cuenta = (t) => todos.filter(v => v.tipo === t).length;
      const abierto = state.ui.tvVideoAbierto;
      const ev = state.temporada.proximoEvento;
      const directo = TWITCH.enDirecto;

      return `
        <section class="section-card">
          <div class="section-header">
            <div>
              <h2 class="section-title">Bugambra TV</h2>
              <p style="font-size:var(--fs-sm);color:var(--text-muted);">Directos, carreras, entrevistas y clips de la liga y de las cámaras de los pilotos · ${state.ui.tvOrigen === 'vivo' ? 'en vivo de Twitch' : 'copia del 22 oct'}</p>
            </div>
            <a class="btn btn-secondary" href="https://www.twitch.tv/${TWITCH.canal}/videos" target="_blank" rel="noopener">Ver en Twitch</a>
          </div>

          <div class="tv-directo ${directo ? 'is-live' : ''}">
            ${directo ? `
              <span class="badge-pill badge-split">En directo · ${directo.espectadores} viendo</span>
              <h3>${directo.titulo}</h3>
              ${abierto === 'directo' ? reproductorTwitch({ canal: TWITCH.canal, titulo: directo.titulo, directo: true })
                : '<button type="button" class="btn btn-primary" onclick="abrirVideoTv(\'directo\')">Ver el directo</button>'}
            ` : `
              <span class="badge-pill">Directo apagado</span>
              <h3>No hay emisión ahora mismo</h3>
              <p>La próxima será la del ${etiquetaGp(ev)}: ${ev.pais} (${ev.circuito}). Mientras, tienes abajo los vídeos de la temporada.</p>
            `}
          </div>

          <div class="tv-filtros">
          <div class="seg" role="group" aria-label="Canal">
            <button type="button" class="seg-btn" aria-pressed="${canalSel === 'todos'}" onclick="setTvCanal('todos')">Todos los canales</button>
            ${(TWITCH.canales || []).map(c => `<button type="button" class="seg-btn" aria-pressed="${canalSel === c.login}" onclick="setTvCanal('${c.login}')">${c.nombre}${c.enDirecto ? '<span class="seg-live" aria-label="en directo"></span>' : ''}</button>`).join('')}
          </div>
          <div class="pill-filter-row" role="group" aria-label="Filtrar vídeos">
            ${[['todo', `Todo (${todos.length})`], ['entrevistas', `Entrevistas (${cuenta('Entrevista')})`], ['carreras', `Carreras (${cuenta('Carrera')})`], ['directos', `Directos (${cuenta('Directo')})`], ['clips', `Clips (${cuenta('Clip')})`]]
              .map(([k, n]) => `<button type="button" class="pill-filter" aria-pressed="${filtro === k}" onclick="setTvFiltro('${k}')">${n}</button>`).join('')}
          </div>
          </div>

          <div class="tv-grid">
            ${lista.map(tarjetaVideo).join('') || '<p class="evo-nota">No hay vídeos de este tipo en el canal.</p>'}
          </div>
          <p class="evo-nota">Twitch borra los directos pasados al cabo de unas semanas. Para conservar una carrera o una entrevista, hay que destacarla o subirla como vídeo en el canal.</p>
        </section>
      `;
    }

