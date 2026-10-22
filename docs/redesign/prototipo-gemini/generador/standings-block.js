    function renderCleanStandingsBlock(contextTitle) {
      const teamFilter = state.ui.teamFilterPill;
      const season = state.ui.seasonFilter;
      const t = temporadaPorNombre(season);
      const individual = t.tipo === 'individual';
      let mode = state.ui.standingsMode;
      const alcance = state.ui.evoAlcance || 'split';

      const pilotosT = clasificacionPilotos(t);
      const liderPuntos = pilotosT[0].pts;
      const equiposT = clasificacionEquipos(t);
      const liderEqPuntos = equiposT.length ? equiposT[0].pts : 0;
      const pilotosFiltrados = pilotosT.filter(p => teamFilter === 'todas' || p.equipo === teamFilter);
      const pilotoState = (slug) => state.pilotos.find(x => x.slug === slug);

      const subnavHtml = `
        ${renderTemporadasRail(season, 'setSeasonFilter')}
        <div class="f1-subnav-bar">
          <div class="f1-subnav-links" role="tablist" aria-label="Vistas de clasificación">
            <button type="button" class="subnav-tab ${mode === 'pilotos' ? 'is-active' : ''}" onclick="setStandingsMode('pilotos')">Pilotos</button>
            <button type="button" class="subnav-tab ${mode === 'escuderias' ? 'is-active' : ''}" onclick="setStandingsMode('escuderias')">${individual ? 'Dúos' : 'Escuderías'}</button>
            <button type="button" class="subnav-tab ${mode === 'carreras' ? 'is-active' : ''}" onclick="setStandingsMode('carreras')">Carreras</button>
            <button type="button" class="subnav-tab ${mode === 'palmares' ? 'is-active' : ''}" onclick="setStandingsMode('palmares')">Palmarés</button>
          </div>
        </div>
      `;

      const pillsHtml = mode === 'pilotos' && !individual ? `
        <div class="pill-filter-row" role="group" aria-label="Filtrar por escudería">
          <button type="button" class="pill-filter" aria-pressed="${teamFilter === 'todas'}" onclick="setTeamFilterPill('todas')">
            Todas las escuderías
          </button>
          ${state.equipos.map(e => `
            <button type="button" class="pill-filter" aria-pressed="${teamFilter === e.id}" onclick="setTeamFilterPill('${e.id}')">
              ${e.nombre}
            </button>
          `).join('')}
        </div>
      ` : '';

      const headingMap = {
        pilotos: `PILOTOS · ${season.toUpperCase()}`,
        escuderias: `${individual ? 'DÚOS' : 'ESCUDERÍAS'} · ${season.toUpperCase()}`,
        carreras: `CARRERAS · ${season.toUpperCase()}`,
        palmares: 'PALMARÉS DE LA LIGA'
      };
      const subtitulo = individual
        ? 'Temporada previa a la Temporada 1, corrida por dúos: dos pilotos sumaban juntos. Sin escuderías ni economía.'
        : `${t.agregada ? 'Splits 1, 2 y 3 sumados · ' : ''}GP ${t.gps[0].n} a ${t.gps[t.gps.length - 1].n} de la Temporada 1${t.enCurso ? ' · en curso' : ' · cerrado'} · ${state.ui.origenDatos === 'vivo' ? 'datos en vivo de la liga' : 'copia de los datos del 22 oct'}`;

      let tableContent = '';
      if (mode === 'pilotos') {
        tableContent = `
          <div class="clean-table-panel">
            <table class="standings-table" aria-label="Clasificación de pilotos">
              <thead>
                <tr>
                  <th style="width:64px;">POS</th>
                  <th>PILOTO</th>
                  ${individual ? '' : '<th class="hide-on-mobile">ESCUDERÍA</th>'}
                  <th class="hide-on-mobile col-right">DIF.</th>
                  <th class="col-right">PTS</th>
                </tr>
              </thead>
              <tbody>
                ${pilotosFiltrados.map(p => {
                  const pos = pilotosT.findIndex(x => x.slug === p.slug) + 1;
                  const isPodio = pos <= 3;
                  const diff = pos === 1 ? '—' : `−${liderPuntos - p.pts}`;
                  const ps = pilotoState(p.slug);
                  const eq = p.equipo ? getEquipo(p.equipo) : null;
                  return `
                    <tr>
                      <td><span class="pos-cell"><span class="${isPodio ? 'pos-podium' : ''}">${pos}</span></span></td>
                      <td>
                        <div>
                          ${renderPilotTrigger(t.enCurso && !t.agregada && ps ? ps : (cartaDeTemporada(p.slug, t.nombre) || p.nombre))}
                          <span class="mobile-sub-team">${p.equipos ? p.equipos.map(nombreEquipo).join(' → ') : eq ? eq.nombre : 'Individual'}</span>
                        </div>
                      </td>
                      ${individual ? '' : `
                        <td class="hide-on-mobile">
                          <span class="team-cell-inline"><span class="team-logo-mini">${logoEquipo(eq)}</span><span>${p.equipos ? p.equipos.map(nombreEquipo).join(' → ') : eq.nombre}</span></span>
                        </td>`}
                      <td class="hide-on-mobile col-right"><span class="gap-pill">${diff}</span></td>
                      <td class="col-right"><span class="pts-strong">${p.pts}</span>${pos === 1 ? '' : `<span class="dif-movil">${diff}</span>`}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          ${renderPuntosPilotosPorGp(t, individual ? 'todas' : teamFilter)}
        `;
      } else if (mode === 'escuderias' && individual) {
        tableContent = renderDuos(t);
      } else if (mode === 'escuderias') {
        tableContent = `
          <div class="clean-table-panel">
            <table class="standings-table" aria-label="Clasificación de escuderías">
              <thead>
                <tr>
                  <th style="width:64px;">POS</th>
                  <th>ESCUDERÍA</th>
                  <th class="hide-on-mobile">PILOTOS</th>
                  <th class="hide-on-mobile col-right">DIF.</th>
                  <th class="col-right">PTS</th>
                </tr>
              </thead>
              <tbody>
                ${equiposT.map((r, idx) => {
                  const e = getEquipo(r.id);
                  const pos = idx + 1;
                  const diff = pos === 1 ? '—' : `−${liderEqPuntos - r.pts}`;
                  // Pilotos ordenados por los puntos que dieron al equipo; en la Temporada 1, split a split.
                  const ptsPara = (slug) => r.porPiloto ? r.porPiloto[slug].pts : ((t.pilotos[slug] || {}).pts || 0);
                  const lista = (slugs) => slugs.slice().sort((a, b) => ptsPara(b) - ptsPara(a))
                    .map(slug => `${(t.pilotos[slug] || {}).nombre || slug} <span class="pts-mini">${ptsPara(slug)}</span>`).join(' · ');
                  const nombres = t.agregada
                    ? splitsDelAno().map(s => {
                        const de = (s.equipos.find(x => x.id === r.id) || { pilotos: [] }).pilotos;
                        return `<span class="split-linea"><b>${s.nombre}</b> ${de.slice().sort((a, b) => ((s.pilotos[b] || {}).pts || 0) - ((s.pilotos[a] || {}).pts || 0)).map(slug => `${(s.pilotos[slug] || {}).nombre || slug} <span class="pts-mini">${(s.pilotos[slug] || {}).pts || 0}</span>`).join(' · ')}</span>`;
                      }).join('')
                    : lista(r.pilotos);
                  return `
                    <tr>
                      <td><span class="pos-cell"><span class="${pos <= 3 ? 'pos-podium' : ''}">${pos}</span></span></td>
                      <td>
                        <span class="team-cell-inline">
                          <span class="team-logo-mini">${logoEquipo(e)}</span>
                          <strong style="font-size:var(--fs-md);">${e.nombre}</strong>
                        </span>
                        <span class="mobile-sub-team">${nombres}</span>
                      </td>
                      <td class="hide-on-mobile" style="color:var(--text-muted);">${nombres}</td>
                      <td class="hide-on-mobile col-right"><span class="gap-pill">${diff}</span></td>
                      <td class="col-right"><span class="pts-strong">${r.pts}</span>${pos === 1 ? '' : `<span class="dif-movil">${diff}</span>`}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          ${t.agregada ? '<div class="evo-alcance"></div>' : `<div class="evo-alcance" role="group" aria-label="Alcance de la evolución">
            <button type="button" class="pill-filter" aria-pressed="${alcance === 'split'}" onclick="setEvoAlcance('split')">Solo ${t.nombre}</button>
            <button type="button" class="pill-filter" aria-pressed="${alcance === 'ano'}" onclick="setEvoAlcance('ano')">Temporada 1 completa</button>
          </div>`}
          ${renderEvolucionEquipos(t, alcance)}
        `;
      } else if (mode === 'carreras') {
        tableContent = `
          <div class="clean-table-panel">
            <table class="standings-table" aria-label="Carreras de ${t.nombre}">
              <thead>
                <tr><th>GP</th><th>GRAN PREMIO</th><th class="hide-on-mobile">FECHA</th><th>GANADOR</th></tr>
              </thead>
              <tbody>
                ${t.gps.map(g => {
                  const ganador = Object.entries(g.res).find(([, r]) => r.pos === 1);
                  const ps = ganador && pilotoState(ganador[0]);
                  return `
                    <tr>
                      <td><strong>GP ${g.n}</strong></td>
                      <td><strong>${g.pais}</strong><span class="mobile-sub-team">${g.circuito}</span></td>
                      <td class="hide-on-mobile" style="color:var(--text-muted);">${fechaCorta(g.fecha) || (g.disputada ? '—' : 'Por confirmar')}</td>
                      <td>${!g.disputada ? `<span class="badge-pill">${t.enCurso && g === t.gps.find(x => !x.disputada) ? 'Próxima' : 'Pendiente'}</span>`
                        : ganador ? renderPilotTrigger(ps || t.pilotos[ganador[0]].nombre)
                        : `<span style="color:var(--text-muted);">${individual ? 'Por puntos: ' + Object.entries(g.res).sort((a, b) => b[1].pts - a[1].pts)[0][0].replace(/^./, c => c.toUpperCase()) : 'Sin registro'}</span>`}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      } else {
        tableContent = renderPalmaresTabla();
      }

      return `
        ${subnavHtml}
        <div style="margin:var(--sp-4) 0 var(--sp-3);">
          <h2 class="page-title">${headingMap[mode]}</h2>
          ${mode === 'palmares' ? '' : `<p class="standings-sub">${subtitulo}</p>`}
        </div>
        ${pillsHtml}
        ${tableContent}
      `;
    }

