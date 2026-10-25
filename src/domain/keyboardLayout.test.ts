import assert from 'node:assert/strict';
import test from 'node:test';
import { keyboardOverlap } from './keyboardLayout.ts';

const phone = { x: 0, y: 0, width: 390, height: 844 };
const keyboard = { screenX: 0, screenY: 510, width: 390, height: 334 };

test('lifts the whole modal by the docked keyboard overlap, independent of sheet height', () => {
  assert.equal(keyboardOverlap(phone, keyboard), 334);
});
test('accounts for a modal window offset in the same coordinate system', () => {
  assert.equal(keyboardOverlap({ x: 0, y: 47, width: 390, height: 797 }, keyboard), 334);
});
test('does not apply keyboard padding twice if the host has resized the modal', () => {
  assert.equal(keyboardOverlap({ ...phone, height: 510 }, keyboard), 0);
});
test('hidden and hardware keyboards restore the full viewport', () => {
  assert.equal(keyboardOverlap(phone, null), 0);
  assert.equal(keyboardOverlap(phone, { ...keyboard, screenY: 844 }), 0);
  assert.equal(keyboardOverlap(phone, { ...keyboard, height: 0 }), 0);
});
test('recomputes from the current window after rotation', () => {
  assert.equal(keyboardOverlap({ x: 0, y: 0, width: 844, height: 390 }, { screenX: 0, screenY: 180, width: 844, height: 210 }), 210);
});
test('does not move the bottom composer for an undocked or separate-window keyboard', () => {
  assert.equal(keyboardOverlap(phone, { screenX: 20, screenY: 240, width: 320, height: 220 }), 0);
  assert.equal(keyboardOverlap(phone, { ...keyboard, screenX: 600 }), 0);
});
test('invalid native measurements cannot collapse the panel', () => {
  assert.equal(keyboardOverlap({ ...phone, height: Number.NaN }, keyboard), 0);
  assert.equal(keyboardOverlap(phone, { ...keyboard, screenY: Number.POSITIVE_INFINITY }), 0);
  assert.equal(keyboardOverlap(phone, { ...keyboard, width: 0 }), 0);
});
