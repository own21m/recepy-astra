import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldCapturePanel, shouldDismissPanel } from './panelGesture.ts';

test('la receta captura un arrastre hacia la derecha, sin robar el scroll vertical', () => {
  assert.equal(shouldCapturePanel('recipe', 40, 4), true);
  assert.equal(shouldCapturePanel('recipe', -60, 0), false);
  assert.equal(shouldCapturePanel('recipe', 20, 45), false);
});
test('comentarios captura hacia abajo y conserva los movimientos en otras direcciones', () => {
  assert.equal(shouldCapturePanel('comments', 3, 30), true);
  assert.equal(shouldCapturePanel('comments', 30, 3), false);
  assert.equal(shouldCapturePanel('comments', 0, -30), false);
});
test('cerrar exige distancia suficiente o un gesto rápido con recorrido mínimo', () => {
  assert.equal(shouldDismissPanel(100, .1), true);
  assert.equal(shouldDismissPanel(35, .8), true);
  assert.equal(shouldDismissPanel(10, 1.2), false);
  assert.equal(shouldDismissPanel(50, .2), false);
  assert.equal(shouldDismissPanel(NaN, 1), false);
});
