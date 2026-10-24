    /** Tabla para rellenar el acta: clasificación y carrera del 1 al 20 (parrilla completa, con la IA) o «No corrió»,
        vuelta rápida y estado FIA. Se rellena con lo guardado y avisa de puestos repetidos. */
    function renderActaResultados(orden) {
      const t = temporadaActual();
      const g = t.gps.find(x => x.n === Number(orden));
      const pilotos = clasificacionEquipos(t).flatMap(r => r.pilotos.filter(s => t.pilotos[s]).map(s => ({ slug: s, ...t.pilotos[s] })));
      setTimeout(() => window.validarActa(), 0); // el aviso se calcula en cuanto la tabla está pintada
      const opciones = (sel, extra) => `<option value="">—</option>`
        + Array.from({ length: 20 }, (_, i) => `<option value="${i + 1}" ${sel === i + 1 ? 'selected' : ''}>${i + 1}.º</option>`).join('')
        + (extra || []).map(([v, n]) => `<option value="${v}" ${sel === v ? 'selected' : ''}>${n}</option>`).join('');
      return `
        <div class="admin-scroll">
          <table class="admin-table acta-tabla" id="actaTabla" aria-label="Resultados del GP ${orden}">
            <thead><tr><th class="sticky-col">Piloto</th><th>Clasificación</th><th>Carrera</th><th>Vuelta rápida</th><th>Estado FIA</th><th>Puesto tras sanción</th></tr></thead>
            <tbody>
              ${pilotos.map(p => {
                const r = g && g.res[p.slug];
                const carrera = !g || !g.disputada ? null : !r ? 'NC' : r.pos === 'DNF' ? 'DNF' : typeof r.pos === 'number' ? r.pos : null;
                return `
                  <tr data-piloto="${p.slug}">
                    <th class="sticky-col" scope="row">${renderPilotTrigger(state.pilotos.find(x => x.slug === p.slug) || p.nombre)}<small>${nombreEquipo(p.equipo)}</small></th>
                    <td><select class="form-input acta-q" aria-label="Clasificación de ${p.nombre}" onchange="validarActa()">${opciones(!r ? (g && g.disputada ? 'NC' : null) : r.q === 99 ? 'NC' : (r.q && r.q < 99 ? r.q : null), [['NC', 'No corrió']])}</select></td>
                    <td><select class="form-input acta-c" aria-label="Carrera de ${p.nombre}" onchange="validarActa()">${opciones(carrera, [['DNF', 'DNF'], ['NC', 'No corrió']])}</select></td>
                    <td style="text-align:center;"><input type="radio" name="actaVr" value="${p.slug}" ${r && r.vr ? 'checked' : ''} aria-label="Vuelta rápida de ${p.nombre}" onchange="validarActa()"></td>
                    <td><select class="form-input acta-fia" aria-label="Estado FIA de ${p.nombre}" onchange="validarActa()"><option ${r && r.limpio === false ? '' : 'selected'}>Limpio</option><option ${r && r.limpio === false ? 'selected' : ''}>Sancionado</option></select></td>
                    <td><select class="form-input acta-s" aria-label="Puesto de ${p.nombre} tras la sanción" onchange="validarActa()" disabled>
                      <option value="">Sin cambio</option>${Array.from({ length: 20 }, (_, i) => `<option value="${i + 1}">${i + 1}.º</option>`).join('')}<option value="DSQ">Descalificado</option>
                    </select></td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <p class="acta-aviso" id="actaAviso" aria-live="polite"></p>
        <p class="evo-nota">Las posiciones van del 1 al 20 porque cuentan los coches de la IA. La pole es quien sale 1.º en clasificación. Si la FIA cambia un puesto después de cerrar el acta, «Reabrir acta» revierte antes su economía (solo la de la última carrera procesada); se corrige el puesto, se cierra y se procesa de nuevo.</p>`;
    }

    /** Puestos repetidos, pole y vuelta rápida: lo mismo que exige la web real antes de procesar la economía. */
    window.validarActa = function() {
      const filas = [...document.querySelectorAll('#actaTabla tbody tr')];
      const nombre = (tr) => tr.querySelector('.driver-name') ? tr.querySelector('.driver-name').textContent : tr.dataset.piloto;
      const avisos = [];
      // El puesto tras sanción solo se puede tocar si el piloto está sancionado; cuenta como su puesto final.
      filas.forEach(tr => {
        const s = tr.querySelector('.acta-s');
        s.disabled = tr.querySelector('.acta-fia').value !== 'Sancionado';
        if (s.disabled) s.value = '';
      });
      const valorFinal = (tr, clase) => clase === 'acta-c' && tr.querySelector('.acta-s').value ? tr.querySelector('.acta-s') : tr.querySelector('.' + clase);
      [['acta-q', 'clasificación'], ['acta-c', 'carrera (puesto final)']].forEach(([clase, cual]) => {
        const usados = {};
        filas.forEach(tr => {
          tr.querySelector('.' + clase).classList.remove('is-error');
          tr.querySelector('.acta-s').classList.remove('is-error');
          const sel = valorFinal(tr, clase);
          if (/^\d+$/.test(sel.value)) (usados[sel.value] = usados[sel.value] || []).push(tr);
        });
        Object.entries(usados).filter(([, trs]) => trs.length > 1).forEach(([pos, trs]) => {
          trs.forEach(tr => valorFinal(tr, clase).classList.add('is-error'));
          avisos.push(`${pos}.º repetido en ${cual}: ${trs.map(nombre).join(' y ')}`);
        });
      });
      const pole = filas.find(tr => tr.querySelector('.acta-q').value === '1');
      const vr = filas.find(tr => tr.querySelector('input[name="actaVr"]').checked);
      const el = document.getElementById('actaAviso');
      if (!el) return;
      el.className = 'acta-aviso ' + (avisos.length ? 'is-error' : 'is-ok');
      el.innerHTML = avisos.length ? avisos.join('<br>')
        : `Sin puestos repetidos · Pole: ${pole ? nombre(pole) : 'ninguna'} · Vuelta rápida: ${vr ? nombre(vr) : 'ninguna'}`
          + filas.filter(tr => tr.querySelector('.acta-s').value).map(tr => `<br>${nombre(tr)}: ${tr.querySelector('.acta-c').value || '—'}.º en pista → ${tr.querySelector('.acta-s').value === 'DSQ' ? 'descalificado' : tr.querySelector('.acta-s').value + '.º'} tras la sanción`).join('');
    };

