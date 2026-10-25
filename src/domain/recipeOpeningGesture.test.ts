import assert from 'node:assert/strict';
import test from 'node:test';
import { recipeOpeningOffset, shouldCaptureRecipeOpening, shouldCompleteRecipeOpening } from './recipeOpeningGesture.ts';

test('abrir captura únicamente un arrastre horizontal deliberado hacia la derecha', () => {
  assert.equal(shouldCaptureRecipeOpening(40, 4), true);
  assert.equal(shouldCaptureRecipeOpening(40, -4), true);
  assert.equal(shouldCaptureRecipeOpening(20, 0), false);
  assert.equal(shouldCaptureRecipeOpening(-60, 0), false);
  assert.equal(shouldCaptureRecipeOpening(30, 40), false);
  assert.equal(shouldCaptureRecipeOpening(32, 20), false);
});

test('la apertura sigue la posición del dedo desde el borde izquierdo', () => {
  assert.deepEqual([0, 40, 160, 260, 390].map(dx => recipeOpeningOffset(dx, 390)), [-390, -350, -230, -130, 0]);
  assert.equal(recipeOpeningOffset(140, 800), -660);
});

test('deshacer el recorrido devuelve el panel y permite cancelar aunque antes cruzara el umbral', () => {
  assert.deepEqual([0, 160, 80, 10, -30].map(dx => recipeOpeningOffset(dx, 390)), [-390, -230, -310, -380, -390]);
  assert.equal(shouldCompleteRecipeOpening(160, 390), true);
  assert.equal(shouldCompleteRecipeOpening(80, 390), false);
  assert.equal(shouldCompleteRecipeOpening(0, 390), false);
});

test('soltar antes del 35 por ciento cancela y alcanzar el umbral completa la apertura', () => {
  assert.equal(shouldCompleteRecipeOpening(139, 400), false);
  assert.equal(shouldCompleteRecipeOpening(140, 400), true);
  assert.equal(shouldCompleteRecipeOpening(30, 400), false);
  assert.equal(shouldCompleteRecipeOpening(279, 800), false);
  assert.equal(shouldCompleteRecipeOpening(280, 800), true);
});

test('el panel no rebasa los bordes y un recorrido completo puede abrirlo', () => {
  assert.equal(recipeOpeningOffset(-90, 390), -390);
  assert.equal(recipeOpeningOffset(900, 390), 0);
  assert.equal(shouldCompleteRecipeOpening(390, 390), true);
  assert.equal(shouldCompleteRecipeOpening(900, 390), true);
});

test('datos inválidos no capturan ni completan la apertura y nunca producen un offset no finito', () => {
  for (const invalid of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.equal(shouldCaptureRecipeOpening(invalid, 0), false);
    assert.equal(shouldCaptureRecipeOpening(40, invalid), false);
    assert.equal(shouldCompleteRecipeOpening(invalid, 390), false);
    assert.equal(shouldCompleteRecipeOpening(140, invalid), false);
    assert.equal(recipeOpeningOffset(invalid, 390), -390);
    assert.equal(recipeOpeningOffset(140, invalid), 0);
  }
  for (const width of [0, -390]) {
    assert.equal(shouldCompleteRecipeOpening(140, width), false);
    assert.equal(recipeOpeningOffset(140, width), 0);
  }
});
