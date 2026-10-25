import assert from 'node:assert/strict';
import test from 'node:test';
import { clampPanelOffset, shouldCapturePanel, shouldDismissPanel } from './panelGesture.ts';

test('la receta captura solo un arrastre hacia la izquierda, sin robar el scroll vertical', () => {
  assert.equal(shouldCapturePanel('recipe', -40, 4), true);
  assert.equal(shouldCapturePanel('recipe', 60, 0), false);
  assert.equal(shouldCapturePanel('recipe', -20, 45), false);
  assert.equal(shouldCapturePanel('recipe', -8, 0), false);
});

test('el panel sigue el dedo de forma continua y vuelve hacia cero al deshacer el arrastre', () => {
  assert.deepEqual([-12, -60, -120, -45, 15].map(offset => clampPanelOffset('recipe', offset, 390)), [-12, -60, -120, -45, 0]);
  assert.equal(clampPanelOffset('recipe', -600, 390), -390);
  assert.equal(clampPanelOffset('comments', 80, 600), 80);
  assert.equal(clampPanelOffset('comments', -80, 600), 0);
  assert.equal(clampPanelOffset('comments', 800, 600), 600);
});

test('medidas inválidas no desplazan ni cierran el panel', () => {
  assert.equal(clampPanelOffset('recipe', Number.NaN, 390), 0);
  assert.equal(clampPanelOffset('recipe', -80, 0), 0);
  assert.equal(clampPanelOffset('comments', 80, Number.POSITIVE_INFINITY), 0);
  assert.equal(clampPanelOffset('default', -80, 390), 0);
  assert.equal(shouldCapturePanel('recipe', Number.NaN, 0), false);
  assert.equal(shouldDismissPanel(120, Number.NaN), false);
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
