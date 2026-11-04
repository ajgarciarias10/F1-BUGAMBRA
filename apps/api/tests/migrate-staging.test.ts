import assert from 'node:assert/strict';
import test from 'node:test';
import { dnfOf, ledgerOrder, positionOf, reconcileBalances, signedAmount } from '../scripts/migrate-staging-to-schema.ts';

const doc = (seq: number, path: string, data: Record<string, unknown>) => ({ seq, path, coleccion: path.split('/')[0]!, data, sha256: '' });

test('orden del libro: fecha normalizada y secuencia de copia para históricos sin fecha', () => {
  const ordered = ledgerOrder([
    doc(3, 'transacciones/historico_b', { cantidad: 2 }),
    doc(2, 'transacciones/iso', { fecha: '2026-10-01T12:00:00Z', cantidad: 1 }),
    doc(1, 'transacciones/historico_a', { cantidad: 3 }),
    doc(4, 'transacciones/timestamp', { fecha: { __t: 'timestamp', iso: '2026-09-01T12:00:00Z' }, cantidad: 4 }),
  ]);
  assert.deepEqual(ordered.map(item => item.path), [
    'transacciones/timestamp', 'transacciones/iso', 'transacciones/historico_a', 'transacciones/historico_b',
  ]);
});

test('el marcador 99 de la fuente significa posición desconocida, nunca DNF', () => {
  assert.equal(positionOf(99), null);
  assert.equal(positionOf(null), null);
  assert.equal(positionOf(1), 1);
  assert.throws(() => positionOf(0), /Posición inválida/);
  assert.equal(dnfOf({ puntos: 0 }), false);
  assert.equal(dnfOf({ isDnfOwnError: true }), true);
});

test('signos de asientos y conciliación informativa: reembolso, cargo, insuficiencia, negativo y sin cambio', () => {
  const team = doc(1, 'splits/split_x/equipos/equipo_x', { nombre: 'Equipo X', presupuesto_inicial: 10, presupuesto: 2 });
  const movements = [
    doc(2, 'transacciones/refund', { splitId: 'split_x', equipoId: 'equipo_x', cantidad: 5, esIngreso: true }),
    doc(3, 'transacciones/charge', { splitId: 'split_x', equipoId: 'equipo_x', cantidad: 20, esIngreso: false }),
    doc(4, 'transacciones/negative_price', { splitId: 'split_x', equipoId: 'equipo_x', cantidad: -3, esIngreso: false }),
    doc(5, 'transacciones/unchanged', { splitId: 'split_x', equipoId: 'equipo_x', cantidad: 0, esIngreso: true }),
  ];
  assert.deepEqual(movements.map(item => signedAmount(item.data)), [5, -20, 3, 0]);
  const report = reconcileBalances([team, ...movements])[0]!;
  assert.equal(report.stored, 2);
  assert.equal(report.calculated, -2);
  assert.equal(report.difference, 4);
  assert.equal(team.data.presupuesto, 2, 'la conciliación no corrige un saldo insuficiente');
});
