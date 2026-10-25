import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRecipeText } from './recipeParser.ts';
import { reviewRecipeClarity } from './recipeReview.ts';

test('asks authors for missing oven temperature and finishing criteria without supplying values', () => {
  const recipe = parseRecipeText('Pan\nPorciones: 2\nTiempo: 20 minutos\nIngredientes:\n200 g de harina\nPreparación:\n1. Hornea el pan.');
  const hints = reviewRecipeClarity(recipe);
  assert.equal(hints.length, 2);
  assert.equal(hints[0].id, 'oven-temperature');
  assert.equal(hints[1].stepId, 'step-1');
  assert.doesNotMatch(JSON.stringify(hints), /180|200 °|20 minutos/);
});
test('accepts an English temperature and visual cue instead of demanding a fabricated timer', () => {
  const recipe = parseRecipeText('Toast\nServings: 2\nTotal time: 10 minutes\nIngredients:\n2 slices bread\nDirections:\n1. Bake at 350 F until golden.');
  assert.equal(recipe.steps.length, 1);
  assert.deepEqual(reviewRecipeClarity(recipe), []);
});
test('does not warn about chopping or serving, and accepts time ranges as author supplied criteria', () => {
  const recipe = parseRecipeText('Salsa\nPorciones: 2\nTiempo: 20 minutos\nIngredientes:\n2 tomates\nPreparación:\n1. Corta los tomates.\n2. Cocina de 10 a 15 minutos.\n3. Sirve.');
  assert.deepEqual(reviewRecipeClarity(recipe), []);
});
