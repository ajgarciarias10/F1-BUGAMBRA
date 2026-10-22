/* Lee de Twitch los canales de la liga (tonicotitular) y de los pilotos que emiten (fabiml_204): directo, vídeos y clips.
   Usa la API pública que carga la propia web de Twitch: solo lectura y sin cuenta. Sirve en el navegador y en Node. */
(function (root) {
  'use strict';
  // Canal de la liga y canales de pilotos que retransmiten su cámara.
  const CANALES = [
    { login: 'tonicotitular', nombre: 'Bugambra TV', piloto: null },
    { login: 'fabiml_204', nombre: 'Fabi', piloto: 'fabi' }
  ];
  const CAMPOS = `
    stream { id title viewersCount }
    videos(first: 30, sort: TIME) { edges { node { id title createdAt lengthSeconds viewCount previewThumbnailURL(width: 640, height: 360) game { name } } } }
    clips(first: 40, criteria: { period: ALL_TIME }) { edges { node { slug title createdAt durationSeconds viewCount thumbnailURL game { name } } } }`;
  const QUERY = `query { ${CANALES.map((c, i) => `c${i}: user(login: "${c.login}") { ${CAMPOS} }`).join(' ')} }`;

  function tipoDe(titulo, canal) {
    if (/entrevista|cara a cara/i.test(titulo)) return 'Entrevista';
    // En el canal de un piloto, cada vídeo de F1 es su cámara de una carrera.
    if (canal.piloto || /gran premio|league|\bgp\b|race/i.test(titulo)) return 'Carrera';
    return 'Directo';
  }
  function splitDe(titulo, fecha) {
    const m = /split\s*(\d+)/i.exec(titulo);
    if (m) return `Split ${m[1]}`;
    return null;
  }
  const esDeLaLiga = (canal, item) => !canal.piloto || /F1/i.test((item.game && item.game.name) || item.title);

  async function cargarTwitch(fetchImpl) {
    const r = await fetchImpl('https://gql.twitch.tv/gql', {
      method: 'POST',
      headers: { 'Client-Id': 'kimne78kx3ncx6brgo4mv6wki5h1ko', 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: QUERY })
    });
    if (!r.ok) throw new Error(`Twitch ${r.status}`);
    const j = await r.json();
    if (!j.data) throw new Error('Twitch no devolvió datos');
    const canales = [], videos = [], clips = [];
    CANALES.forEach((c, i) => {
      const u = j.data[`c${i}`];
      if (!u) return;
      canales.push({ ...c, enDirecto: u.stream ? { titulo: u.stream.title, espectadores: u.stream.viewersCount } : null });
      u.videos.edges.map(e => e.node).filter(v => esDeLaLiga(c, v)).forEach(v => videos.push({
        id: v.id, canal: c.login, autor: c.nombre, piloto: c.piloto, titulo: v.title.replace(/\s+/g, ' ').trim(),
        fecha: v.createdAt.slice(0, 10), segundos: v.lengthSeconds, vistas: v.viewCount, miniatura: v.previewThumbnailURL,
        tipo: tipoDe(v.title, c), split: splitDe(v.title)
      }));
      // Solo los clips de la época de la liga (desde 2026); los canales tienen otros más antiguos.
      u.clips.edges.map(e => e.node).filter(x => x.createdAt.slice(0, 10) >= '2026-01-01' && esDeLaLiga(c, x)).forEach(x => clips.push({
        slug: x.slug, canal: c.login, autor: c.nombre, piloto: c.piloto, titulo: x.title.replace(/\s+/g, ' ').trim(),
        fecha: x.createdAt.slice(0, 10), segundos: x.durationSeconds, vistas: x.viewCount, miniatura: x.thumbnailURL, tipo: 'Clip', split: splitDe(x.title)
      }));
    });
    videos.sort((a, b) => b.fecha.localeCompare(a.fecha));
    clips.sort((a, b) => b.fecha.localeCompare(a.fecha));
    const liga = canales.find(c => !c.piloto) || {};
    return { canal: liga.login, canales, enDirecto: liga.enDirecto || null, videos, clips };
  }

  root.cargarTwitch = cargarTwitch;
  if (typeof module !== 'undefined') module.exports = { cargarTwitch };
})(typeof window !== 'undefined' ? window : globalThis);
