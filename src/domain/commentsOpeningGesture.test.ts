import assert from 'node:assert/strict';
import test from 'node:test';
import { commentsOpeningOffset, commentsPanelTravel, shouldCaptureCommentsOpening, shouldCompleteCommentsOpening } from './commentsOpeningGesture.ts';

test('los comentarios capturan únicamente un arrastre vertical deliberado hacia arriba', () => {
  assert.equal(shouldCaptureCommentsOpening(0, -30), true);
  assert.equal(shouldCaptureCommentsOpening(4, -40), true);
  assert.equal(shouldCaptureCommentsOpening(-4, -40), true);
  assert.equal(shouldCaptureCommentsOpening(0, -14), false);
  assert.equal(shouldCaptureCommentsOpening(0, 40), false);
  assert.equal(shouldCaptureCommentsOpening(40, -30), false);
  assert.equal(shouldCaptureCommentsOpening(20, -32), false);
});

test('el recorrido oculto coincide con la altura real del panel del 86 por ciento', () => {
  assert.equal(commentsPanelTravel(500), 430);
  assert.equal(commentsPanelTravel(1000), 860);
  assert.equal(commentsPanelTravel(2000, true), 1050);
  assert.equal(commentsPanelTravel(2000), 1720);
  assert.ok(Math.abs(commentsPanelTravel(844) - 725.84) < .00001);
  assert.equal(commentsOpeningOffset(0, commentsPanelTravel(500)), 430);
  assert.equal(commentsOpeningOffset(-430, commentsPanelTravel(500)), 0);
});

test('la apertura vertical sigue de forma continua el desplazamiento del dedo', () => {
  assert.deepEqual([0, -20, -100, -250, -430].map(dy => commentsOpeningOffset(dy, 430)), [430, 410, 330, 180, 0]);
  assert.equal(commentsOpeningOffset(-160, 800), 640);
});

test('invertir el gesto devuelve el panel y permite cancelar aunque antes superara el umbral', () => {
  assert.deepEqual([0, -200, -100, -10, 30].map(dy => commentsOpeningOffset(dy, 430)), [430, 230, 330, 420, 430]);
  assert.equal(shouldCompleteCommentsOpening(-200, 430), true);
  assert.equal(shouldCompleteCommentsOpening(-100, 430), false);
  assert.equal(shouldCompleteCommentsOpening(0, 430), false);
});

test('soltar antes del 35 por ciento cancela y alcanzar el umbral completa la apertura', () => {
  assert.equal(shouldCompleteCommentsOpening(-139, 400), false);
  assert.equal(shouldCompleteCommentsOpening(-140, 400), true);
  assert.equal(shouldCompleteCommentsOpening(-30, 400), false);
  assert.equal(shouldCompleteCommentsOpening(-279, 800), false);
  assert.equal(shouldCompleteCommentsOpening(-280, 800), true);
});

test('el panel no rebasa sus extremos y se abre al recorrer toda su altura', () => {
  assert.equal(commentsOpeningOffset(90, 430), 430);
  assert.equal(commentsOpeningOffset(-900, 430), 0);
  assert.equal(shouldCompleteCommentsOpening(-430, 430), true);
  assert.equal(shouldCompleteCommentsOpening(-900, 430), true);
  assert.equal(shouldCompleteCommentsOpening(900, 430), false);
});

test('datos inválidos no capturan ni completan y nunca generan geometría no finita', () => {
  for (const invalid of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.equal(shouldCaptureCommentsOpening(invalid, -40), false);
    assert.equal(shouldCaptureCommentsOpening(0, invalid), false);
    assert.equal(shouldCompleteCommentsOpening(invalid, 430), false);
    assert.equal(shouldCompleteCommentsOpening(-160, invalid), false);
    assert.equal(commentsOpeningOffset(invalid, 430), 430);
    assert.equal(commentsOpeningOffset(-160, invalid), 0);
    assert.equal(commentsPanelTravel(invalid), 0);
  }
  for (const invalidExtent of [0, -430]) {
    assert.equal(shouldCompleteCommentsOpening(-160, invalidExtent), false);
    assert.equal(commentsOpeningOffset(-160, invalidExtent), 0);
    assert.equal(commentsPanelTravel(invalidExtent), 0);
  }
});
