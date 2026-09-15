import { collection, doc, getDocs, increment, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { clausulaInicialDe, mantenerInicialDe } from "./economyService";

// Todos los equipos, incluido el contenedor libre aunque todavía no tenga documento padre.
async function pilotLocations(splitId: string, pilotoId: string) {
  const teams = await getDocs(collection(db, `splits/${splitId}/equipos`));
  return [...new Set([...teams.docs.map(d => d.id), "agente_libre"])]
    .map(id => doc(db, `splits/${splitId}/equipos/${id}/pilotos`, pilotoId));
}

export async function guardarPacto(params: {
  splitId: string; nextSplitId: string | null; equipoOrigenId: string; pilotoId: string;
  equipoDestinoId: string; precio: number; tipo: string; circuitoId: string | null;
}) {
  const { splitId, nextSplitId, equipoOrigenId, pilotoId, equipoDestinoId, precio, tipo, circuitoId } = params;
  if (!Number.isFinite(precio)) throw new Error("Importe no válido.");
  if (!nextSplitId) throw new Error("Crea primero el split de destino para registrar un pacto reversible.");
  if (equipoDestinoId === "agente_libre") throw new Error("Selecciona una escudería para el pacto.");
  const refs = nextSplitId ? await pilotLocations(nextSplitId, pilotoId) : [];
  const source = doc(db, `splits/${splitId}/equipos/${equipoOrigenId}/pilotos`, pilotoId);
  await runTransaction(db, async tx => {
    const sourceSnap = await tx.get(source);
    if (!sourceSnap.exists()) throw new Error("La ficha de origen ya no existe.");
    const data = sourceSnap.data();
    if (data.pending_equipoId && data.pending_fichas_previas_v2 == null && data.pending_fichas_previas == null) throw new Error("Este pacto antiguo no guardó su estado anterior. Anúlalo y revisa la plantilla antes de registrarlo de nuevo.");
    if (data.pending_splitId && data.pending_splitId !== nextSplitId) throw new Error("Deshaz primero el pacto con el split anterior de destino.");
    const split = await tx.get(doc(db, "splits", splitId));
    const sellerId = split.data()?.economia_config?.clausula_al_vendedor === true && tipo === "clausula" && precio > 0 && equipoOrigenId !== "agente_libre" && equipoOrigenId !== equipoDestinoId ? equipoOrigenId : null;
    const ids = [...new Set([equipoDestinoId, data.pending_equipoId, sellerId, data.pending_vendedor_id].filter(id => id && id !== "agente_libre"))] as string[];
    const [teams, destinations, next] = await Promise.all([
      Promise.all(ids.map(id => tx.get(doc(db, `splits/${splitId}/equipos`, id)))),
      Promise.all(refs.map(ref => tx.get(ref))),
      nextSplitId ? tx.get(doc(db, "splits", nextSplitId)) : Promise.resolve(null),
    ]);
    const targetTeam = nextSplitId ? await tx.get(doc(db, `splits/${nextSplitId}/equipos`, equipoDestinoId)) : null;
    const inheritedTeams = nextSplitId ? await Promise.all(ids.map(id => tx.get(doc(db, `splits/${nextSplitId}/equipos`, id)))) : [];
    const roster = await getDocs(collection(db, `splits/${nextSplitId}/equipos/${equipoDestinoId}/pilotos`));
    if (teams.some(s => !s.exists())) throw new Error("Una de las escuderías no existe.");
    if (nextSplitId && (!next?.exists() || !targetTeam?.exists())) throw new Error("Crea la escudería en el split de destino antes de pactar.");
    if (next?.data()?.temporada_iniciada) throw new Error("El split de destino ya ha comenzado.");
    if (destinations.some(s => s.exists() && s.data()?.ultima_operacion_id)) throw new Error("El piloto tiene un alta directa en el split siguiente. Deshaz esa alta antes de pactar.");
    const deltas: Record<string, number> = { [equipoDestinoId]: -precio };
    if (data.pending_equipoId && data.pending_precio_compra != null) {
      deltas[data.pending_equipoId] = (deltas[data.pending_equipoId] ?? 0) + data.pending_precio_compra;
    }
    if (data.pending_vendedor_id) deltas[data.pending_vendedor_id] = (deltas[data.pending_vendedor_id] ?? 0) - Number(data.pending_vendedor_delta ?? 0);
    if (sellerId) deltas[sellerId] = (deltas[sellerId] ?? 0) + precio;
    const buyer = teams.find(t => t.id === equipoDestinoId)!;
    if (deltas[equipoDestinoId] < 0 && Number(buyer.data()!.presupuesto ?? 0) + deltas[equipoDestinoId] < 0) throw new Error("Presupuesto insuficiente para pactar.");
    tx.update(targetTeam!.ref, { mercado_revision: increment(1) });
    for (const team of teams) {
      const delta = deltas[team.id] ?? 0;
      tx.update(team.ref, { presupuesto: increment(delta) });
      if (delta) tx.set(doc(collection(db, "transacciones")), {
        splitId, equipoId: team.id, equipo: team.data()!.nombre || team.id,
        pilotoId, tipo: "ajuste", cantidad: Math.abs(delta), esIngreso: delta > 0,
        descripcion: `Pacto ${tipo}: ${pilotoId}`, fecha: serverTimestamp(),
      });
    }
    for (const team of inheritedTeams) {
      if (team.data()?.presupuesto_origen_splitId !== splitId) continue;
      const delta = deltas[team.id] ?? 0;
      tx.update(team.ref, { presupuesto: increment(delta) });
    }
    const previas = data.pending_fichas_previas_v2 ?? data.pending_fichas_previas?.map((p: any) => ({ equipoId: p.equipoId, datos: JSON.parse(p.datos_json) })) ?? destinations.filter(s => s.exists()).map(s => ({
      equipoId: s.ref.parent.parent!.id, datos: s.data(),
    }));
    tx.update(source, {
      congelado: true, congelado_en: circuitoId, pending_equipoId: equipoDestinoId,
      pending_precio_compra: precio, pending_tipo_fichaje: tipo, pending_splitId: nextSplitId,
      pending_fichas_previas_v2: previas,
      pending_vendedor_id: sellerId, pending_vendedor_delta: sellerId ? precio : 0,
    });
    if (nextSplitId) {
      for (const snapshot of destinations) if (snapshot.exists()) tx.delete(snapshot.ref);
      tx.set(doc(db, `splits/${nextSplitId}/equipos/${equipoDestinoId}/pilotos`, pilotoId), {
        pilotoId, nombre: data.nombre || pilotoId, equipoId: equipoDestinoId, tipo_fichaje: tipo,
        rating_piloto: data.rating_piloto ?? 0, rating_base: data.rating_piloto ?? 0,
        puntos_piloto: 0, victorias: 0, podios: 0, poles: 0, dnfs: 0, carreras_limpias: 0,
        precio_compra: precio, mantener_actual: mantenerInicialDe(precio), clausula_actual: clausulaInicialDe(precio),
        mantener_inicial_split: mantenerInicialDe(precio), clausula_inicial_split: clausulaInicialDe(precio),
        precio_carrera_anterior: mantenerInicialDe(precio), historial_precios: {},
        pacto_origen: source.path,
      });
    }
  });
}

export async function anularPacto(splitId: string, equipoId: string, pilotoId: string, fallbackNext: string | null) {
  const source = doc(db, `splits/${splitId}/equipos/${equipoId}/pilotos`, pilotoId);
  // La referencia guardada evita que reordenar splits cambie el destino de una devolución.
  const { getDoc } = await import("firebase/firestore");
  const initial = await getDoc(source);
  const nextId = initial.data()?.pending_splitId === undefined ? fallbackNext : initial.data()?.pending_splitId;
  const refs = nextId ? await pilotLocations(nextId, pilotoId) : [];
  return runTransaction(db, async tx => {
    const snap = await tx.get(source);
    if (!snap.exists()) throw new Error("La ficha ya no existe.");
    const data = snap.data();
    if (!data.pending_equipoId) throw new Error("Este piloto no tiene un pacto pendiente.");
    if ((data.pending_splitId === undefined ? fallbackNext : data.pending_splitId) !== nextId) throw new Error("El pacto ha cambiado. Recarga e inténtalo de nuevo.");
    const team = await tx.get(doc(db, `splits/${splitId}/equipos`, data.pending_equipoId));
    const destinations = await Promise.all(refs.map(ref => tx.get(ref)));
    const next = nextId ? await tx.get(doc(db, "splits", nextId)) : null;
    const inheritedTeam = nextId ? await tx.get(doc(db, `splits/${nextId}/equipos`, data.pending_equipoId)) : null;
    const seller = data.pending_vendedor_id ? await tx.get(doc(db, `splits/${splitId}/equipos`, data.pending_vendedor_id)) : null;
    const inheritedSeller = nextId && data.pending_vendedor_id ? await tx.get(doc(db, `splits/${nextId}/equipos`, data.pending_vendedor_id)) : null;
    if (next?.data()?.temporada_iniciada) throw new Error("El split de destino ya ha comenzado.");
    if (!team.exists()) throw new Error("No existe el equipo al que devolver el importe.");
    if (seller && !seller.exists()) throw new Error("No existe la escudería vendedora.");
    const previas = data.pending_fichas_previas_v2 ?? data.pending_fichas_previas?.map((p: any) => ({ equipoId: p.equipoId, datos: JSON.parse(p.datos_json) }));
    const delta = Number(data.pending_precio_compra ?? 0);
    if (!Number.isFinite(delta)) throw new Error("El precio guardado no es válido.");
    tx.update(team.ref, { presupuesto: increment(delta) });
    if (inheritedTeam?.data()?.presupuesto_origen_splitId === splitId) {
      tx.update(inheritedTeam.ref, { presupuesto: increment(delta) });
    }
    if (seller) {
      const sellerDelta = -Number(data.pending_vendedor_delta ?? 0);
      tx.update(seller.ref, { presupuesto: increment(sellerDelta) });
      if (inheritedSeller?.data()?.presupuesto_origen_splitId === splitId) tx.update(inheritedSeller.ref, { presupuesto: increment(sellerDelta) });
      tx.set(doc(collection(db, "transacciones")), {
        splitId, equipoId: seller.id, equipo: seller.data()!.nombre || seller.id, pilotoId, tipo: "ajuste",
        cantidad: Math.abs(sellerDelta), esIngreso: sellerDelta >= 0, descripcion: `Anulación de cláusula cobrada: ${pilotoId}`, fecha: serverTimestamp(),
      });
    }
    tx.set(doc(collection(db, "transacciones")), {
      splitId, equipoId: team.id, equipo: team.data()!.nombre || team.id, pilotoId,
      tipo: "ajuste", cantidad: Math.abs(delta), esIngreso: delta >= 0,
      descripcion: `Anulación de pacto: ${pilotoId}`, fecha: serverTimestamp(),
    });
    for (const destination of destinations) {
      if (!destination.exists()) continue;
      if (destination.data()?.ultima_operacion_id || destination.data()?.pending_equipoId || Object.keys(destination.data()?.historial_precios ?? {}).length) throw new Error("La ficha de destino tiene actividad posterior. Deshazla primero.");
      if (destination.data()?.pacto_origen && destination.data()?.pacto_origen !== source.path) throw new Error("La ficha tiene otro pacto posterior.");
      tx.delete(destination.ref);
    }
    if (nextId) for (const previa of previas ?? []) {
      tx.set(doc(db, `splits/${nextId}/equipos/${previa.equipoId}/pilotos`, pilotoId), previa.datos);
    }
    tx.update(source, {
      congelado: false, congelado_en: null, pending_equipoId: null, pending_precio_compra: null,
      pending_tipo_fichaje: null, pending_splitId: null, pending_fichas_previas: null, pending_fichas_previas_v2: null,
      pending_vendedor_id: null, pending_vendedor_delta: null,
    });
    return previas == null ? "sin-foto" : "restaurado";
  });
}

export async function deshacerAlta(splitId: string, equipoId: string, pilotoId: string) {
  const ref = doc(db, `splits/${splitId}/equipos/${equipoId}/pilotos`, pilotoId);
  await runTransaction(db, async tx => {
    const pilot = await tx.get(ref);
    const id = pilot.data()?.ultima_operacion_id;
    if (!id) throw new Error("Este fichaje antiguo no tiene justificante reversible. Revisa sus movimientos y usa un ajuste administrativo.");
    const operation = await tx.get(doc(db, `splits/${splitId}/transfers`, id));
    const data = operation.data();
    if (!data || data.estado !== "aplicada" || data.teamId !== equipoId || data.pilotoId !== pilotoId) throw new Error("La operación ya fue anulada o no corresponde a esta ficha.");
    if (pilot.data()?.pending_equipoId || Object.keys(pilot.data()?.historial_precios ?? {}).length) throw new Error("Hay actividad posterior: deshaz primero los pactos y la economía de carreras del piloto.");
    const team = await tx.get(doc(db, `splits/${splitId}/equipos`, equipoId));
    const seller = data.vendedorId ? await tx.get(doc(db, `splits/${splitId}/equipos`, data.vendedorId)) : null;
    const origin = data.equipoOrigenId ? doc(db, `splits/${splitId}/equipos/${data.equipoOrigenId}/pilotos`, pilotoId) : null;
    const previous = origin ? await tx.get(origin) : null;
    if (previous?.exists() && origin?.path !== ref.path) throw new Error("Ya existe otra ficha en la escudería de origen.");
    if (!team.exists() || (seller && !seller.exists())) throw new Error("Falta una escudería de la operación.");
    tx.update(team.ref, { presupuesto: increment(data.precio) });
    if (seller) tx.update(seller.ref, { presupuesto: increment(-data.vendedorDelta) });
    tx.delete(ref);
    if (origin && data.fichaAnterior) tx.set(origin, data.fichaAnterior);
    tx.update(operation.ref, { estado: "anulada", anulada_en: serverTimestamp() });
    for (const [teamId, nombre, delta] of [[equipoId, team.data()!.nombre || equipoId, data.precio],
      ...(seller ? [[seller.id, seller.data()!.nombre || seller.id, -data.vendedorDelta]] : [])]) {
      tx.set(doc(collection(db, "transacciones")), {
        splitId, equipoId: teamId, equipo: nombre, pilotoId, operacionId: id, tipo: "ajuste",
        cantidad: Math.abs(delta), esIngreso: delta >= 0, descripcion: `Anulación de fichaje: ${pilotoId}`, fecha: serverTimestamp(),
      });
    }
  });
}
