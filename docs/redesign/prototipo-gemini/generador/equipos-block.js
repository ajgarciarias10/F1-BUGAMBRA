    /** Escuderías y pilotos de cualquier split: plantillas, puntos y saldo de aquel momento. */
    function renderTabEquipos() {
      const t = temporadaPorNombre(state.ui.equiposSplit || state.temporada.split);
      const individual = t.tipo === 'individual';
      const anteriores = splitsDelAno();
      const previo = anteriores[anteriores.indexOf(t) - 1] || null;
      const equipoNeutro = { id: null, nombre: 'Individual', surfaceClass: '', colorHex: '#8a8a8a', siglas: 'ORI' };

      const pilotosSplit = clasificacionPilotos(t).map(r => {
        const base = state.pilotos.find(x => x.slug === r.slug);
        // Fuera del split en curso, cada carta es la de esa temporada (valoración, escudería y carreras de entonces).
        if (!t.enCurso || t.agregada) return cartaDeTemporada(r.slug, t.nombre);
        return {
          ...(base || { id: r.slug, slug: r.slug, nombrePila: '', nombre: r.nombre, ovr: '—', nivel: '—' }),
          equipoId: r.equipo, puntos: r.pts, equipoVirtual: individual ? equipoNeutro : null
        };
      });
      const equiposSplit = clasificacionEquipos(t).map((r, i) => {
        const pil = t.agregada
          ? r.pilotos.map(slug => ({ ...cartaDeTemporada(slug, t.nombre), equipoId: r.id, puntos: r.porPiloto[slug].pts }))
          : pilotosSplit.filter(p => p.equipoId === r.id);
        const ovrs = pil.map(p => p.ovr).filter(o => typeof o === 'number');
        const antes = previo ? (previo.equipos.find(e => e.id === r.id) || { pilotos: [] }).pilotos : null;
        return {
          ...getEquipo(r.id), puntos: r.pts, puesto: i + 1, pilotosSplit: pil, pilotos: r.pilotos, porPiloto: r.porPiloto || {},
          mediaOvr: ovrs.length ? Math.round(ovrs.reduce((s, o) => s + o, 0) / ovrs.length) : '—',
          saldoSalida: r.saldoInicial, saldoFin: t.enCurso ? r.saldoActual : r.saldoCierre,
          altas: antes ? r.pilotos.filter(s => !antes.includes(s)) : [],
          bajas: antes ? antes.filter(s => !r.pilotos.includes(s)) : []
        };
      });
      const selectedEq = equiposSplit.find(e => e.id === state.ui.selectedTeamDetailId);
      const nombreDe = (slug, temporada) => ((temporada || t).pilotos[slug] || {}).nombre || slug;

      return `
        <section class="section-card">
          ${renderTemporadasRail(t.nombre, 'setEquiposSplit')}
          <div class="section-header">
            <div>
              <h2 class="section-title">${individual ? 'Pilotos' : 'Escuderías'} · ${t.nombre}</h2>
              <p style="font-size:var(--fs-sm);color:var(--text-muted);">
                ${individual
                  ? 'Origins se corrió por dúos: dos pilotos que sumaban juntos. No había escuderías ni economía.'
                  : `GP ${t.gps[0].n}–${t.gps[t.gps.length - 1].n} · ${t.enCurso ? 'en curso' : 'cerrado'}. Plantillas, puntos y saldo de ese split. Toca una escudería para ver su detalle.`}
              </p>
            </div>
          </div>

          ${individual ? `
            <div class="f1-teams-grid">
              ${t.duos.map((d, i) => {
                const ps = d.pilotos.map(s => pilotosSplit.find(p => p.slug === s) || { slug: s, nombre: s, equipoId: null });
                return `
                  <article class="f1-team-card duo-card">
                    <div class="f1-team-card-top">
                      <div class="f1-team-header-row">
                        <div>
                          <h2 class="f1-team-title">${d.nombre}</h2>
                          <div style="font-size:var(--fs-xs);opacity:0.9;margin-top:0.15rem;">Dúo · ${ps.map(p => `${p.nombre} ${p.puntos ?? 0} pts`).join(' · ')}</div>
                        </div>
                      </div>
                    </div>
                    <div class="f1-team-poster-bleed">
                      <div class="team-lineup">${ps.map(p => fotoPiloto(p) ? `<img src="${fotoPiloto(p)}" alt="${p.nombre}">` : `<span class="duo-sin-foto">${p.nombre}</span>`).join('')}</div>
                    </div>
                    <div class="f1-team-Bottom-strip"><span>${i + 1}.º · ${d.pts} pts</span><span>Origins</span></div>
                  </article>`;
              }).join('')}
            </div>
          ` : `
            <div class="f1-teams-grid">
              ${equiposSplit.map(eq => renderF1TeamCard(eq, eq.pilotosSplit)).join('')}
            </div>

            ${selectedEq ? `
              <div class="clean-table-panel" style="margin-bottom:var(--sp-5);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-3);">
                  <h3 class="section-title">${selectedEq.nombre} en el ${t.nombre}</h3>
                  <button type="button" class="btn btn-secondary" onclick="selectTeamDetail(null)">Cerrar detalle</button>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:var(--sp-3);font-size:var(--fs-sm);color:var(--text-muted);">
                  <span>Puesto: <strong style="color:var(--text-main);">${selectedEq.puesto}.º · ${selectedEq.puntos} pts</strong></span>
                  <span>Saldo de salida: <strong style="color:var(--text-main);">${fmtM(selectedEq.saldoSalida)}</strong></span>
                  <span>${t.enCurso ? 'Saldo actual' : 'Saldo de cierre'}: <strong style="color:var(--text-main);">${fmtM(selectedEq.saldoFin)}</strong></span>
                  <span>Pilotos: <strong style="color:var(--text-main);">${selectedEq.pilotosSplit.map(p => `${p.nombre} (${p.puntos})`).join(', ')}</strong></span>
                </div>
              </div>
            ` : ''}

            ${t.agregada ? `
              <div class="section-header"><h2 class="section-title">Pilotos que han pasado por cada escudería</h2></div>
              <div class="clean-table-panel" style="margin-bottom:var(--sp-5);">
                <table class="standings-table" aria-label="Pilotos de cada escudería en la Temporada 1">
                  <thead><tr><th>ESCUDERÍA</th><th>PILOTO</th>${splitsDelAno().map(s => `<th class="hide-on-mobile" style="text-align:center;">${s.nombre.toUpperCase()}</th>`).join('')}<th class="col-right">PTS PARA EL EQUIPO</th></tr></thead>
                  <tbody>
                    ${equiposSplit.map(eq => eq.pilotos.slice().sort((a, b) => {
                      // Por el primer split en el que corrió para el equipo y, dentro, por puntos.
                      const orden = splitsDelAno().map(s => s.nombre);
                      return orden.indexOf(eq.porPiloto[a].splits[0]) - orden.indexOf(eq.porPiloto[b].splits[0]) || eq.porPiloto[b].pts - eq.porPiloto[a].pts;
                    }).map((slug, k) => {
                      const x = eq.porPiloto[slug];
                      const carta = eq.pilotosSplit.find(p => p.slug === slug);
                      return `
                        <tr>
                          <td>${k === 0 ? `<span class="team-cell-inline"><span class="team-logo-mini">${logoEquipo(eq)}</span><strong>${eq.nombre}</strong></span>` : ''}</td>
                          <td>${renderPilotTrigger(carta)}<span class="mobile-sub-team">${x.splits.join(', ')}</span></td>
                          ${splitsDelAno().map(s => `<td class="hide-on-mobile" style="text-align:center;">${x.splits.includes(s.nombre) ? '●' : '<span style="color:var(--text-muted);">—</span>'}</td>`).join('')}
                          <td class="col-right"><strong>${x.pts}</strong></td>
                        </tr>`;
                    }).join('')).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            ${previo ? `
              <div class="section-header"><h2 class="section-title">Cambios respecto al ${previo.nombre}</h2></div>
              <div class="clean-table-panel" style="margin-bottom:var(--sp-5);">
                <table class="standings-table" aria-label="Altas y bajas de cada escudería">
                  <thead><tr><th>ESCUDERÍA</th><th>ALTAS</th><th>BAJAS</th></tr></thead>
                  <tbody>
                    ${equiposSplit.map(eq => `
                      <tr>
                        <td><span class="team-cell-inline"><span class="team-logo-mini">${logoEquipo(eq)}</span><strong>${eq.nombre}</strong></span></td>
                        <td>${eq.altas.length ? eq.altas.map(s => {
                          const de = previo.pilotos[s];
                          return `▲ ${nombreDe(s)}<span class="mobile-sub-team" style="display:block;">${de ? 'de ' + nombreEquipo(de.equipo) : 'nuevo en la liga'}</span>`;
                        }).join('') : '<span style="color:var(--text-muted);">—</span>'}</td>
                        <td>${eq.bajas.length ? eq.bajas.map(s => {
                          const a = t.pilotos[s];
                          return `▼ ${nombreDe(s, previo)}<span class="mobile-sub-team" style="display:block;">${a ? 'a ' + nombreEquipo(a.equipo) : 'deja la liga'}</span>`;
                        }).join('') : '<span style="color:var(--text-muted);">—</span>'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}
          `}

          <div class="section-header">
            <div>
              <h2 class="section-title">Pilotos de la parrilla (${pilotosSplit.length})</h2>
              <p style="font-size:var(--fs-sm);color:var(--text-muted);">
                ${individual ? 'Ordenados por puntos individuales.' : `Ordenados por escudería y puntos del ${t.nombre}.`} ${t.enCurso && !t.agregada ? 'Valoración actual.' : 'Valoración y escudería de esa temporada; toca una carta para ver sus carreras.'}
              </p>
            </div>
          </div>

          <div class="f1-drivers-grid">
            ${(individual || t.agregada ? pilotosSplit : equiposSplit.flatMap(eq => eq.pilotosSplit)).map(p => renderF1DriverCard(p)).join('')}
          </div>
        </section>
      `;
    }

    window.setEquiposSplit = function(nombre) {
      state.ui.equiposSplit = nombre;
      state.ui.selectedTeamDetailId = null;
      renderApp();
    };

