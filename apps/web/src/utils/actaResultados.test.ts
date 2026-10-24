import assert from "node:assert/strict";
import test from "node:test";
import { resultadosDelActa, type EntradaActa } from "./actaResultados.ts";

const acta = (): EntradaActa[] => [
  { pilotoId: "piloto_fabi", nombre: "Fabi", qualyPos: 1, racePos: 2, fastestLap: true },
  { pilotoId: "piloto_jose", nombre: "Jose", qualyPos: "2", racePos: "1", isClean: false },
  { pilotoId: "piloto_mesa", nombre: "Mesa", qualyPos: 3, isDnf: true, isDnfOwnError: true },
];

test("el acta válida se convierte en resultados", () => {
  const r = resultadosDelActa(acta());
  assert.deepEqual(r.map(x => [x.pilotoId, x.qualyPos, x.racePos, x.isDnf, x.isDnfOwnError, x.fastestLap, x.isClean]), [
    ["piloto_fabi", 1, 2, false, false, true, true],
    ["piloto_jose", 2, 1, false, false, false, false],
    ["piloto_mesa", 3, 99, true, true, false, true],
  ]);
});

test("el acta exige puestos, una pole, una vuelta rápida y nada repetido", () => {
  const sin = acta(); sin[1].racePos = "";
  assert.throws(() => resultadosDelActa(sin), /Falta la posición de carrera de Jose/);
  const dosPoles = acta(); dosPoles[1].qualyPos = 1;
  assert.throws(() => resultadosDelActa(dosPoles), /exactamente una pole/);
  const sinVr = acta(); sinVr[0].fastestLap = false;
  assert.throws(() => resultadosDelActa(sinVr), /exactamente una vuelta rápida/);
  const repetido = acta(); repetido[1].racePos = 2;
  assert.throws(() => resultadosDelActa(repetido), /duplicadas: carrera 2/);
});
