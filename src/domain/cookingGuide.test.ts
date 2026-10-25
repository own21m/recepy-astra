import assert from 'node:assert/strict';
import test from 'node:test';
import { buildStepGuide, instructionWithoutTitle } from './cookingGuide.ts';

test('shows authored Celsius and Fahrenheit temperatures without treating amounts as heat', () => {
  assert.deepEqual(buildStepGuide('Añade 200 g. Hornea a 220 °C y luego a 180°C.').temperatures, ['220 °C', '180°C']);
  assert.deepEqual(buildStepGuide('Bake at 350°F with 150 ml of milk.').temperatures, ['350°F']);
  assert.deepEqual(buildStepGuide('Preheat to 180 degrees Celsius.').temperatures, ['180 degrees Celsius']);
  assert.deepEqual(buildStepGuide('Añade 250 g de harina y 180 ml de leche.').temperatures, []);
});

test('keeps sensory stopping cues exactly as written in Spanish and English', () => {
  assert.deepEqual(buildStepGuide('Hornea hasta que los bordes estén dorados. Retira.').signals, ['hasta que los bordes estén dorados']);
  assert.deepEqual(buildStepGuide('Whisk until smooth; fold in the flour.').signals, ['until smooth']);
  assert.deepEqual(buildStepGuide('Hornea 10 minutos.').signals, []);
});

test('breaks authored instructions into readable actions without changing their words', () => {
  assert.deepEqual(buildStepGuide('Añade 1.5 g de sal. Mezcla bien; sirve caliente.').actions, ['Añade 1.5 g de sal.', 'Mezcla bien', 'sirve caliente.']);
  assert.deepEqual(buildStepGuide('').actions, []);
});

test('offers relevant technique help in both languages and avoids partial word matches', () => {
  assert.deepEqual(buildStepGuide('Cuece la pasta al dente.').techniques.map(item => item.id), ['al-dente']);
  assert.deepEqual(buildStepGuide('Whisk until smooth, then fold in the flour.').techniques.map(item => item.id), ['fold', 'whisk']);
  assert.deepEqual(buildStepGuide('Serve the salsa and a folded napkin.').techniques, []);
  assert.deepEqual(buildStepGuide('Sirve salsa y leche.').techniques, []);
});

test('removes only an exact repeated title instead of losing instruction content', () => {
  assert.equal(instructionWithoutTitle('Asa los tomates. Precalienta a 220°C.', 'Asa los tomates'), 'Precalienta a 220°C.');
  assert.equal(instructionWithoutTitle('Asa los tomates con aceite.', 'Asa los tomates'), 'Asa los tomates con aceite.');
  assert.equal(instructionWithoutTitle('Sirve y disfruta.', 'Sirve y disfruta'), '');
});

test('does not confuse lowering the heat or reduced-fat ingredients with reducing sauce', () => {
  assert.deepEqual(buildStepGuide('Reduce the heat and add reduced-fat milk.').techniques, []);
  assert.deepEqual(buildStepGuide('Reduce el fuego y mezcla.').techniques, []);
  assert.deepEqual(buildStepGuide('Reduce la salsa hasta que espese.').techniques.map(item => item.id), ['reduce']);
});
