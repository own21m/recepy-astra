import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRecipeText, scaleIngredient, formatDuration, exampleRecipeText } from './recipeParser.ts';

const recipeWith = (ingredients: string, steps = '1. Mezcla y cocina durante 5 minutos.') => `Mi receta\nPorciones: 2\nTiempo: 10 minutos\nIngredientes:\n${ingredients}\nPreparación:\n${steps}`;

test('parses a complete Spanish recipe without fabricating steps', () => {
  const recipe = parseRecipeText(exampleRecipeText);
  assert.equal(recipe.title, 'Rigatoni con tomate asado y burrata');
  assert.equal(recipe.servings, 2);
  assert.equal(recipe.totalMinutes, 30);
  assert.equal(recipe.ingredients.length, 7);
  assert.equal(recipe.steps.length, 4);
  assert.equal(recipe.steps[0].durationSeconds, 1200);
  assert.equal(recipe.steps[1].durationSeconds, 600);
  assert.equal(recipe.steps[3].durationSeconds, null);
  assert.equal(recipe.warnings.length, 0);
});

test('parses decimal commas and scales ingredients', () => {
  const recipe = parseRecipeText(recipeWith('- 1,5 cucharadas de aceite\n- 200 g de pasta'));
  assert.equal(recipe.ingredients[0].quantity, 1.5);
  assert.equal(recipe.ingredients[0].name, 'aceite');
  assert.equal(scaleIngredient(recipe.ingredients[0], 2, 4), '3 cucharadas');
  assert.equal(scaleIngredient(recipe.ingredients[1], 2, 3), '300 g');
});

test('supports ASCII fractions, mixed fractions, Unicode fractions and glued mixed fractions', () => {
  const recipe = parseRecipeText(recipeWith('1/2 taza de leche\n1 1/2 tazas de harina\n¼ cucharadita de sal\n1½ tazas de agua'));
  assert.deepEqual(recipe.ingredients.map(ingredient => ingredient.quantity), [.5, 1.5, .25, 1.5]);
  assert.equal(scaleIngredient(recipe.ingredients[0], 2, 3), '0,75 tazas');
});

test('preserves ranges and warns rather than choosing a false exact quantity', () => {
  const recipe = parseRecipeText(recipeWith('1–2 cucharadas de aceite\n2 a 3 tomates'));
  assert.deepEqual(recipe.ingredients.map(ingredient => ingredient.quantity), [null, null]);
  assert.equal(recipe.ingredients[0].name, 'aceite');
  assert.equal(scaleIngredient(recipe.ingredients[0], 2, 6), '1–2 cucharadas');
  assert.equal(scaleIngredient(recipe.ingredients[1], 2, 6), '2–3');
  assert.ok(recipe.warnings.some(warning => warning.includes('intervalo')));
});

test('does not perform arithmetic on al gusto or unspecified quantities', () => {
  const recipe = parseRecipeText(recipeWith('Sal y pimienta al gusto\nAlbahaca fresca'));
  assert.equal(recipe.ingredients[0].quantity, null);
  assert.equal(scaleIngredient(recipe.ingredients[0], 2, 10), 'Al gusto');
  assert.equal(scaleIngredient(recipe.ingredients[1], 2, 10), 'Según receta');
  assert.ok(recipe.warnings.some(warning => warning.includes('sin cantidad')));
});

test('extracts timers in seconds and hours without reading oven degrees as time', () => {
  const recipe = parseRecipeText(recipeWith('1 pan', '1. Precalienta a 200 °C.\n2. Hornea durante 1 hora y 20 minutos.\n3. Bate 30 segundos.'));
  assert.deepEqual(recipe.steps.map(step => step.durationSeconds), [null, 4800, 30]);
});

test('does not invent exact timers from a time range', () => {
  const recipe = parseRecipeText(recipeWith('1 pan', '1. Hornea de 15 a 20 minutos.'));
  assert.equal(recipe.steps[0].durationSeconds, null);
  assert.ok(recipe.warnings.some(warning => warning.includes('tiempo del paso 1')));
});

test('understands markdown, alternate headings, CRLF and metadata', () => {
  const recipe = parseRecipeText('## Título: Una sopa\r\nPara 4 personas\r\nTiempo total: 1 h\r\n### Ingredientes\r\n* 1 l de caldo\r\n* 2 zanahorias\r\n### Elaboración\r\n1) Corta las zanahorias.\r\n2) Cocina en el caldo 20 min.');
  assert.equal(recipe.title, 'Una sopa');
  assert.equal(recipe.servings, 4);
  assert.equal(recipe.totalMinutes, 60);
  assert.equal(recipe.ingredients[0].unit, 'l');
  assert.equal(recipe.steps.length, 2);
});

test('infers an unheaded layout while explicitly asking for review', () => {
  const recipe = parseRecipeText('Tostada de tomate\n2 rebanadas de pan\n1 tomate\n1. Tuesta el pan 2 minutos.\n2. Corta el tomate y sirve.');
  assert.equal(recipe.ingredients.length, 2);
  assert.equal(recipe.steps.length, 2);
  assert.ok(recipe.warnings.some(warning => warning.includes('ingredientes por sus cantidades')));
  assert.ok(recipe.warnings.some(warning => warning.includes('pasos por el formato')));
});

test('merges wrapped continuation lines while preserving all instructions', () => {
  const recipe = parseRecipeText(recipeWith('1 cebolla', '1. Cocina la cebolla\n   hasta que esté transparente, unos 5 minutos.\n2. Sirve.'));
  assert.equal(recipe.steps.length, 2);
  assert.match(recipe.steps[0].instruction, /hasta que esté transparente/u);
  assert.equal(recipe.steps[0].durationSeconds, 300);
});

test('links ingredients by words and avoids matching sal inside salsa', () => {
  const recipe = parseRecipeText(recipeWith('1 tomate\n1 pizca de sal\n2 dientes de ajo', '1. Mezcla los tomates con ajo.\n2. Prepara la salsa.\n3. Añade sal.'));
  assert.deepEqual(recipe.steps[0].ingredientIds, ['ingredient-1', 'ingredient-3']);
  assert.deepEqual(recipe.steps[1].ingredientIds, []);
  assert.deepEqual(recipe.steps[2].ingredientIds, ['ingredient-2']);
});

test('flags missing sections and never fabricates a method for an ingredient list', () => {
  const recipe = parseRecipeText('Mi plato\nIngredientes:\n200 g de arroz\nAgua');
  assert.equal(recipe.steps.length, 0);
  assert.ok(recipe.warnings.some(warning => warning.includes('no se han inventado instrucciones')));
  const empty = parseRecipeText('');
  assert.equal(empty.title, 'Tu nueva receta');
  assert.deepEqual(empty.ingredients, []);
  assert.deepEqual(empty.steps, []);
  assert.ok(empty.warnings.length >= 4);
});

test('supports inline semicolon ingredient lists and optional ingredients', () => {
  const recipe = parseRecipeText('Sopa\nPorciones: 2\nTiempo: 5 minutos\nIngredientes: 1 l de caldo; 2 hojas de albahaca (opcional)\nPasos: Calienta el caldo 5 min.');
  assert.equal(recipe.ingredients.length, 2);
  assert.equal(recipe.ingredients[1].name, 'albahaca');
  assert.equal(recipe.ingredients[1].optional, true);
  assert.equal(recipe.steps.length, 1);
});

test('creates stable content IDs and guards invalid serving arithmetic', () => {
  const recipe = parseRecipeText(recipeWith('200 g de arroz'));
  assert.equal(recipe.id, parseRecipeText(recipe.sourceText).id);
  assert.notEqual(recipe.id, parseRecipeText(`${recipe.sourceText}\nSirve.`).id);
  assert.equal(scaleIngredient(recipe.ingredients[0], 0, 4), '200 g');
  assert.equal(scaleIngredient(recipe.ingredients[0], 2, Number.NaN), '200 g');
});

test('formats countdowns and clamps invalid values', () => {
  assert.equal(formatDuration(65), '1:05');
  assert.equal(formatDuration(3661), '1:01:01');
  assert.equal(formatDuration(-5), '0:00');
  assert.equal(formatDuration(Number.NaN), '0:00');
});

test('recognizes both unidad and unidades without putting the unit into the ingredient name', () => {
  const recipe = parseRecipeText(recipeWith('1 unidad de burrata\n2 unidades de tomate'));
  assert.deepEqual(recipe.ingredients.map(ingredient => ingredient.name), ['burrata', 'tomate']);
  assert.deepEqual(recipe.ingredients.map(ingredient => ingredient.unit), ['unidades', 'unidades']);
  assert.equal(scaleIngredient(recipe.ingredients[0], 2, 2), '1 unidad');
  assert.equal(scaleIngredient(recipe.ingredients[1], 2, 2), '2 unidades');
});

test('uses singular units only when the scaled amount is one', () => {
  const recipe = parseRecipeText(recipeWith('2 cucharadas de aceite\n2 pizcas de sal\n2 dientes de ajo\n2 hojas de albahaca'));
  assert.deepEqual(recipe.ingredients.map(ingredient => scaleIngredient(ingredient, 2, 1)), ['1 cucharada', '1 pizca', '1 diente', '1 hoja']);
  assert.equal(scaleIngredient(recipe.ingredients[0], 2, 3), '3 cucharadas');
});

test('recognizes cdta and cdtas as teaspoons', () => {
  const recipe = parseRecipeText(recipeWith('1 cdta de comino\n2 cdtas de pimentón'));
  assert.deepEqual(recipe.ingredients.map(ingredient => ingredient.name), ['comino', 'pimentón']);
  assert.equal(scaleIngredient(recipe.ingredients[0], 2, 2), '1 cucharadita');
  assert.equal(scaleIngredient(recipe.ingredients[1], 2, 2), '2 cucharaditas');
});
