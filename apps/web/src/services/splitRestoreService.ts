import { collection, doc, getDocs, query, where, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

type Entry = { path: string; data: Record<string, any> };
const money = (value: unknown) => {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error("Hay un importe no válido en el cierre de origen.");
  return Math.round(n * 100) / 100;
};
function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
const fingerprint = (entries: Entry[]) => JSON.stringify(canonical([...entries].sort((a, b) => a.path.localeCompare(b.path))));

async function references(sourceId: string, targetId: string) {
  const refs = [doc(db, "splits", sourceId), doc(db, "splits", targetId)];
  for (const splitId of [sourceId, targetId]) {
    const teams = await getDocs(collection(db, `splits/${splitId}/equipos`));
    refs.push(...teams.docs.map(d => d.ref));
    const teamIds = [...new Set([...teams.docs.map(d => d.id), "agente_libre"])];
    for (const id of teamIds) {
      const pilots = await getDocs(collection(db, `splits/${splitId}/equipos/${id}/pilotos`));
      refs.push(...pilots.docs.map(d => d.ref));
    }
    for (const name of ["roster", "circuitos"]) {
      const snaps = await getDocs(collection(db, `splits/${splitId}/${name}`));
      refs.push(...snaps.docs.map(d => d.ref));
    }
  }
  refs.push(doc(db, `splits/${targetId}/subasta`, "sala"));
  for (const name of ["transfers", "subasta/sala/pujas"]) {
    const snaps = await getDocs(collection(db, `splits/${targetId}/${name}`));
    refs.push(...snaps.docs.map(d => d.ref));
  }
  for (const name of ["transacciones", "paddock_posts"]) {
    const snaps = await getDocs(query(collection(db, name), where("splitId", "==", targetId)));
    refs.push(...snaps.docs.filter(d => name !== "paddock_posts" || d.data().kind === "team_welcome").map(d => d.ref));
  }
  return [...new Map(refs.map(ref => [ref.path, ref])).values()];
}

export function planRestauracion(sourceId: string, targetId: string, entries: Entry[]) {
  if (!sourceId || !targetId || sourceId === targetId) throw new Error("Elige dos splits distintos.");
  const source = entries.find(e => e.path === `splits/${sourceId}`)?.data;
  const target = entries.find(e => e.path === `splits/${targetId}`)?.data;
  if (!source || !target) throw new Error("No se encuentra el split de origen o de destino.");
  if (source.tipo === "individual" || target.tipo === "individual") throw new Error("La restauración requiere splits de escuderías.");
  if (entries.some(e => e.path.startsWith(`splits/${targetId}/`) && e.data.pending_equipoId)) throw new Error("El destino tiene pactos hacia otro split. Anúlalos antes de restaurarlo para no dejar cobros o fichas en ese otro split.");
  if (Number(source.orden) >= Number(target.orden)) throw new Error("El origen debe ser anterior al destino.");
  const sourcePrefix = `splits/${sourceId}/equipos/`;
  const sourceTeams = entries.filter(e => e.path.startsWith(sourcePrefix) && e.path.split("/").length === 4 && !e.path.endsWith("/agente_libre"));
  if (!sourceTeams.length) throw new Error("El split de origen no tiene escuderías.");
  const changes = new Map<string, Record<string, any>>();
  const refunds: Record<string, number> = {};
  const pilots = new Map<string, { equipoId: string; data: Record<string, any> }>();
  const sourceCircuits = entries.filter(e => e.path.startsWith(`splits/${sourceId}/circuitos/`));
  const lastRace = Math.max(0, ...sourceCircuits.map(e => Number(e.data.numero_carrera ?? 0)));
  const nested = entries.filter(e => e.path.startsWith(sourcePrefix) && e.path.split("/").length === 6);
  const flat = entries.filter(e => e.path.startsWith(`splits/${sourceId}/roster/`));
  for (const entry of [...nested, ...flat]) {
    const data = entry.data;
    const id = entry.path.split("/").at(-1)!;
    const isNested = entry.path.split("/").length === 6;
    if (!isNested && nested.some(e => e.path.endsWith(`/pilotos/${id}`))) continue;
    const teamId = isNested ? entry.path.split("/")[3] : data.equipoId;
    if (!teamId) throw new Error(`El piloto ${id} no tiene escudería de origen.`);
    if (data.pending_equipoId) {
      if (data.pending_splitId && data.pending_splitId !== targetId) throw new Error(`El piloto ${id} tiene un pacto con otro split.`);
      refunds[data.pending_equipoId] = (refunds[data.pending_equipoId] ?? 0) + money(data.pending_precio_compra ?? 0);
      if (data.pending_vendedor_id) refunds[data.pending_vendedor_id] = (refunds[data.pending_vendedor_id] ?? 0) - money(data.pending_vendedor_delta ?? 0);
      changes.set(entry.path, { ...data, congelado: false, congelado_en: null, pending_equipoId: null,
        pending_precio_compra: null, pending_tipo_fichaje: null, pending_splitId: null,
        pending_fichas_previas: null, pending_fichas_previas_v2: null, pending_vendedor_id: null, pending_vendedor_delta: null });
    }
    if (data.participa_hasta != null && (!lastRace || Number(data.participa_hasta) < lastRace)) continue;
    if (pilots.has(id)) throw new Error(`El piloto ${id} está duplicado al cierre del origen. Corrige esa ficha antes de restaurar.`);
    if (teamId !== "agente_libre" && !sourceTeams.some(e => e.path.endsWith(`/${teamId}`))) throw new Error(`Falta la escudería ${teamId} del piloto ${id}.`);
    pilots.set(id, { equipoId: data.estado_siguiente_split === "agente_libre" ? "agente_libre" : teamId, data });
  }
  if (!pilots.size) throw new Error("No hay pilotos en el cierre de origen.");
  const teams = sourceTeams.map(entry => {
    const id = entry.path.split("/").at(-1)!;
    const data = entry.data;
    const historical = data.economia_historica?.presupuesto_cierre;
    const saldo = money(historical ?? (money(data.presupuesto ?? 0) + (refunds[id] ?? 0)));
    if (refunds[id]) changes.set(entry.path, { ...data, presupuesto: money(money(data.presupuesto ?? 0) + refunds[id]) });
    // Conservar identidad/escudo del origen, sin arrastrar cuentas y estadísticas de otra temporada.
    const { economia_historica, puntos_carreras, ...identity } = data;
    changes.set(`splits/${targetId}/equipos/${id}`, { ...identity, presupuesto: saldo, presupuesto_inicial: saldo,
      presupuesto_origen_splitId: sourceId, puntos_constructores: 0, puntos_carreras: [] });
    return { id, nombre: data.nombre || id, saldo, conciliado: historical != null };
  });
  for (const id of Object.keys(refunds)) if (id !== "agente_libre" && !teams.some(t => t.id === id)) throw new Error(`No existe el equipo ${id} de un pacto pendiente.`);
  changes.set(`splits/${targetId}/equipos/agente_libre`, { nombre: "Agentes libres", presupuesto: 0, presupuesto_inicial: 0, puntos_constructores: 0 });
  for (const [id, { equipoId, data }] of pilots) {
    const rating = data.rating_exacto ?? data.rating_piloto ?? data.rating_base ?? 0;
    const mantener = money(data.mantener_actual ?? 0), clausula = money(data.clausula_actual ?? 0);
    changes.set(`splits/${targetId}/equipos/${equipoId}/pilotos/${id}`, {
      pilotoId: id, nombre: data.nombre || id, equipoId,
      rating_base: rating, rating_piloto: data.rating_piloto ?? rating, rating_exacto: rating,
      precio_compra: money(data.precio_compra ?? 0), mantener_actual: mantener, clausula_actual: clausula,
      mantener_inicial_split: mantener, clausula_inicial_split: clausula, precio_carrera_anterior: mantener,
      valor_split_anterior: mantener, clausula_split_anterior: clausula,
      puntos_piloto: 0, victorias: 0, podios: 0, poles: 0, dnfs: 0, carreras_limpias: 0, vueltas_rapidas: 0,
      historial_precios: {}, historial_rating: {}, congelado: false, participa_hasta: null,
      restaurado_desde: sourceId,
    });
  }
  const targetPrefix = `splits/${targetId}/`;
  const deletes = entries.filter(e => e.path.startsWith(targetPrefix) || e.data.splitId === targetId).map(e => e.path);
  for (const entry of entries.filter(e => e.path.startsWith(`${targetPrefix}circuitos/`))) {
    changes.set(entry.path, { ...entry.data, resultados: [], completado: false, acta_cerrada: false,
      economia_procesada: false, economia_reglas_aplicadas: null, economia_version: 0,
      piloto_dia_votantes: {}, piloto_dia_cerrado: false, piloto_dia_ganador: null });
  }
  changes.set(`splits/${targetId}`, { ...target, completado: false, temporada_iniciada: false,
    temporada_iniciada_en: null, fichajes_abiertos: false, mercado_cerrado_por_plantillas: false,
    mercado_cerrado_en: null, rivalries: null, rivalidades_manual: [], restaurado_desde: sourceId });
  return { teams, pilotos: pilots.size, libres: [...pilots.values()].filter(p => p.equipoId === "agente_libre").length,
    pactos: [...changes.keys()].filter(p => p.startsWith(sourcePrefix) && p.split("/").length === 6).length,
    changes, deletes: deletes.filter(path => !changes.has(path)) };
}

export async function previsualizarRestauracion(sourceId: string, targetId: string) {
  const refs = await references(sourceId, targetId);
  return runTransaction(db, async tx => {
    const snaps = await Promise.all(refs.map(ref => tx.get(ref)));
    const entries = snaps.filter(s => s.exists()).map(s => ({ path: s.ref.path, data: s.data()! }));
    const plan = planRestauracion(sourceId, targetId, entries);
    return { teams: plan.teams, pilotos: plan.pilotos, libres: plan.libres, pactos: plan.pactos, version: fingerprint(entries) };
  });
}

export async function restaurarSplitDesdeCierre(sourceId: string, targetId: string, version: string) {
  const refs = await references(sourceId, targetId);
  const backup = doc(collection(db, "restauraciones_split"));
  return runTransaction(db, async tx => {
    const snaps = await Promise.all(refs.map(ref => tx.get(ref)));
    const entries = snaps.filter(s => s.exists()).map(s => ({ path: s.ref.path, data: s.data()! }));
    if (fingerprint(entries) !== version) throw new Error("Los datos han cambiado desde la vista previa. Vuelve a calcularla.");
    const plan = planRestauracion(sourceId, targetId, entries);
    for (const team of plan.teams) {
      const path = `splits/${sourceId}/equipos/${team.id}`;
      const original = entries.find(e => e.path === path)?.data;
      const updated = plan.changes.get(path);
      if (!original || !updated) continue;
      const delta = money(updated.presupuesto - original.presupuesto);
      if (delta) plan.changes.set(`transacciones/${backup.id}__${team.id}`, {
        splitId: sourceId, equipoId: team.id, equipo: team.nombre, tipo: "ajuste",
        cantidad: Math.abs(delta), esIngreso: delta > 0, fecha: serverTimestamp(),
        descripcion: `Anulación de pactos al restaurar ${targetId} desde ${sourceId}`, restauracionId: backup.id,
      });
    }
    const touched = new Set([...plan.changes.keys(), ...plan.deletes]);
    const originals = entries.filter(e => touched.has(e.path));
    // Agrupar la copia evita duplicar el número de escrituras de todo el historial
    // económico. Cada bloque queda holgadamente por debajo del límite por documento.
    const blocks: Entry[][] = [];
    let size = 0;
    for (const entry of originals) {
      const bytes = new TextEncoder().encode(JSON.stringify(entry)).length;
      if (!blocks.length || size + bytes > 200_000) { blocks.push([]); size = 0; }
      blocks[blocks.length - 1].push(entry); size += bytes;
    }
    if (blocks.length + plan.changes.size + plan.deletes.length + 1 > 450) throw new Error("La restauración supera el tamaño admitido en una operación. No se ha modificado ningún dato.");
    tx.set(backup, { origen: sourceId, destino: targetId, fecha: serverTimestamp(), documentos: originals.length,
      documentos_creados: [...plan.changes.keys()].filter(path => !entries.some(e => e.path === path)) });
    blocks.forEach((documentos, index) => tx.set(doc(db, `${backup.path}/documentos`, String(index)), { documentos }));
    plan.deletes.forEach(path => tx.delete(doc(db, path)));
    plan.changes.forEach((data, path) => tx.set(doc(db, path), data));
    return { backupId: backup.id, pilotos: plan.pilotos, equipos: plan.teams.length };
  });
}
