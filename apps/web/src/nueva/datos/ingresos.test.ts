import assert from "node:assert/strict";
import test from "node:test";
import type { SplitView } from "../../types";
import { DEFAULT_ECONOMY_RULES } from "../../utils/economyRules";
import { desgloseCircuito, ingresosSplit } from "./ingresos";
import { EQUIPO_ID, pid, snapshotASplits } from "./fixtures/snapshot";

const ALFA = EQUIPO_ID.alfa, ZENITH = EQUIPO_ID.zenith, ROSES = EQUIPO_ID.roses;
const split3 = () => snapshotASplits().find(s => s.id === "split_3")!;

test("Split 3, tres carreras: coincide con los totales del panel del dueño por fuente", () => {
  const ingresos = ingresosSplit(split3());
  const sinCeros = (id: string) => Object.fromEntries(Object.entries(ingresos[id].porFuente).filter(([, v]) => v !== 0));
  assert.deepEqual(sinCeros(ALFA), { points: 11.5, rivalry: 25.5, participation: 12, cleanTeam: 6 });
  assert.deepEqual(sinCeros(ROSES), { points: 4.4, fastestLap: 1, rivalry: 8.5, participation: 12, cleanTeam: 9 });
  assert.deepEqual(sinCeros(ZENITH), { points: 6.4, pole: 6, fastestLap: 2, rivalry: 15.5, participation: 12, cleanTeam: 6 });
  assert.equal(ingresos[ALFA].total, 55);
  assert.equal(ingresos[ROSES].total, 34.9);
  assert.equal(ingresos[ZENITH].total, 47.9);
});

test("cada línea conserva su fuente y el tipo de asiento que escribiría procesarEconomiaCarrera", () => {
  const s = split3();
  const hungria = desgloseCircuito(s, s.circuitos.find(c => c.numero_carrera === 13)!);
  assert.deepEqual(hungria.problemas, []);
  const zenith = hungria.porEquipo[ZENITH];
  assert.deepEqual(zenith.lineas.map(l => [l.fuente, l.tipo, l.rivalidad ?? null, l.piloto ?? null, l.importe]), [
    ["points", "ingreso_puntos", null, "Fabi", 1.3],
    ["points", "ingreso_puntos", null, "Moles", 0.1],
    ["points", "ingreso_puntos", null, "Pabliyo", 1.1],
    ["pole", "pole", null, "Pabliyo", 2],
    ["fastestLap", "vuelta_rapida", null, "Pabliyo", 1],
    ["rivalry", "rivalidad", "clasificacion", "Fabi", 1],
    ["rivalry", "rivalidad", "carrera", "Fabi", 1],
    ["rivalry", "rivalidad", "clasificacion", "Moles", 1],
    ["rivalry", "rivalidad", "carrera", "Moles", 1],
    ["rivalry", "rivalidad", "clasificacion", "Pabliyo", 1],
    ["rivalry", "rivalidad", "carrera", "Pabliyo", 2],
    ["participation", "premio_carrera", null, null, 4],
  ]);
  // Pabliyo corrió sancionado: Zenith no cobra «sin sancionados» en Hungría.
  assert.equal(zenith.porFuente.cleanTeam, 0);
  assert.equal(hungria.porEquipo[ROSES].porFuente.cleanTeam, 3);
  // La pareja Dani/Mesa usa los premios de dúo aunque Mesa no corriera: Dani cobra 1 + 2.
  const dani = hungria.porEquipo[ALFA].lineas.filter(l => l.pilotoId === pid("dani") && l.fuente === "rivalry");
  assert.deepEqual(dani.map(l => l.importe), [1, 2]);
});

test("un DNF o un puesto desconocido no puntúan en la rivalidad de carrera", () => {
  const s = split3();
  const italia = desgloseCircuito(s, s.circuitos.find(c => c.numero_carrera === 15)!);
  const pabliyo = italia.lineas.filter(l => l.pilotoId === pid("pabliyo") && l.fuente === "rivalry");
  assert.deepEqual(pabliyo.map(l => l.rivalidad), ["clasificacion"]);
});

test("las cantidades salen de economia_config del split, no de constantes copiadas", () => {
  const s: SplitView = { ...split3(), economia_config: { puntos_factor: 0.2, participacion: 5, solo: 2.5 } };
  s.rivalries = { ...s.rivalries!, soloPilots: [{ ...s.rivalries!.groups[0].members[0], id: pid("moles") }] };
  const hungria = desgloseCircuito(s, s.circuitos.find(c => c.numero_carrera === 13)!);
  const zenith = hungria.porEquipo[ZENITH];
  assert.equal(zenith.porFuente.points, 5); // 25 pts × 0,2
  assert.equal(zenith.porFuente.participation, 5);
  const solo = zenith.lineas.find(l => l.rivalidad === "solo")!;
  assert.deepEqual([solo.piloto, solo.importe, solo.texto], ["Moles", 2.5, "Piloto sin rival: +2.5M"]);
  assert.equal(DEFAULT_ECONOMY_RULES.solo, 1.5); // sin config, el mismo valor que el servicio
});

test("avisa de lo que impediría procesar la carrera, como el servicio", () => {
  const s = split3();
  const hungria = s.circuitos.find(c => c.numero_carrera === 13)!;
  const sinPole = { ...hungria, acta_cerrada: false, resultados: hungria.resultados.map(r => ({ ...r, qualyPos: r.qualyPos === 1 ? 3 : r.qualyPos })) };
  assert.deepEqual(desgloseCircuito(s, sinPole).problemas, [
    "Cierra el acta antes de procesar la economía.", "La carrera debe tener exactamente una pole.",
  ]);
  const invalida = desgloseCircuito({ ...s, economia_config: { pole: -1 } }, hungria);
  assert.deepEqual(invalida.lineas, []);
  assert.equal(invalida.problemas.length, 1);
});

test("en una pareja el segundo no cobra; en un trío sí (premios de dúo frente a los de grupo)", () => {
  const s = split3();
  const hungria = s.circuitos.find(c => c.numero_carrera === 13)!;
  const dani = hungria.resultados.find(r => r.pilotoId === pid("dani"))!;
  // Mesa (Roses) corre por detrás de Dani en clasificación y carrera.
  const conMesa = { ...hungria, resultados: [...hungria.resultados, { ...dani, pilotoId: pid("mesa"), equipoId: ROSES, qualyPos: 11, racePos: 8, puntos: 5 }] };
  const d = desgloseCircuito(s, conMesa);
  assert.deepEqual(d.lineas.filter(l => l.pilotoId === pid("mesa") && l.fuente === "rivalry"), []);
  // Trío Moles/Pinilla/Jota sin Jota: el segundo de clasificación cobra 0,5 y el de carrera 1.
  const moles = d.lineas.filter(l => l.pilotoId === pid("moles") && l.fuente === "rivalry").map(l => [l.rivalidad, l.importe]);
  assert.deepEqual(moles, [["clasificacion", 1], ["carrera", 1]]);
  const pinilla = d.lineas.filter(l => l.pilotoId === pid("pinilla") && l.fuente === "rivalry").map(l => [l.rivalidad, l.importe]);
  assert.deepEqual(pinilla, [["clasificacion", 0.5], ["carrera", 2]]);
});

test("un grupo de tipo «solo» no reparte premios de grupo: solo cuenta soloPilots", () => {
  const s = split3();
  s.rivalries = { groups: [{ ...s.rivalries!.groups[3], type: "solo", members: [s.rivalries!.groups[3].members[0]] }], soloPilots: [] };
  const hungria = desgloseCircuito(s, s.circuitos.find(c => c.numero_carrera === 13)!);
  assert.deepEqual(hungria.lineas.filter(l => l.fuente === "rivalry"), []);
});

test("un circuito procesado usa las reglas que guardó al procesarse, no la config actual", () => {
  const s: SplitView = { ...split3(), economia_config: { participacion: 9 } };
  const hungria = s.circuitos.find(c => c.numero_carrera === 13)!;
  const procesada = { ...hungria, economia_procesada: true, economia_reglas_aplicadas: { ...DEFAULT_ECONOMY_RULES } };
  const d = desgloseCircuito(s, procesada);
  assert.equal(d.reglas, "aplicadas");
  assert.equal(d.porEquipo[ALFA].porFuente.participation, 4);
  const sinGuardar = desgloseCircuito(s, { ...hungria, economia_procesada: false });
  assert.equal(sinGuardar.reglas, "split");
  assert.equal(sinGuardar.porEquipo[ALFA].porFuente.participation, 9);
});
