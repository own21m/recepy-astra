import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRecipeText, scaleIngredient, formatDuration, exampleRecipeText, exampleRecipeTextEnglish } from './recipeParser.ts';

const recipeWith = (ingredients: string, steps = '1. Mezcla y cocina durante 5 minutos.') => `Mi receta\nPorciones: 2\nTiempo: 10 minutos\nIngredientes:\n${ingredients}\nPreparación:\n${steps}`;

test('keeps English dish names that are also verbs as titles rather than cooking steps', () => {
  for (const title of ['Toast', 'Roast chicken', 'Baked potatoes']) {
    const recipe = parseRecipeText(`${title}\nServings: 2\nTotal time: 20 minutes\nIngredients:\n2 slices bread\nDirections:\n1. Bake at 350 F until golden.`);
    assert.equal(recipe.title, title);
    assert.equal(recipe.steps.length, 1);
    assert.equal(recipe.steps[0].instruction, 'Bake at 350 F until golden.');
  }
});

test('links compound English ingredients through distinctive nouns without guessing between two kinds of stock', () => {
  const recipe = parseRecipeText('Dinner\nServings: 2\nTotal time: 20 minutes\nIngredients:\n350 g cherry tomatoes\n2 tbsp olive oil\n200 g chicken breast\n100 ml chicken stock\n100 ml vegetable stock\nDirections:\n1. Cook the tomatoes in oil.\n2. Cook the breast.\n3. Add stock.\n4. Boil water.');
  assert.deepEqual(recipe.steps[0].ingredientIds, ['ingredient-1', 'ingredient-2']);
  assert.deepEqual(recipe.steps[1].ingredientIds, ['ingredient-3']);
  assert.deepEqual(recipe.steps[2].ingredientIds, []);
  assert.deepEqual(recipe.steps[3].ingredientIds, []);
});

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

const englishRecipe = (ingredients: string, steps = '1. Mix and cook for 5 minutes.', metadata = 'Servings: 2\nTotal time: 10 minutes') => `Simple recipe\n${metadata}\nIngredients:\n${ingredients}\nDirections:\n${steps}`;

test('parses the English example and preserves its instructions, temperatures and explicit total', () => {
  const recipe = parseRecipeText(exampleRecipeTextEnglish);
  assert.equal(recipe.language, 'en');
  assert.equal(recipe.title, 'Roasted tomato pasta');
  assert.equal(recipe.servings, 2);
  assert.equal(recipe.totalMinutes, 35);
  assert.equal(recipe.ingredients.length, 7);
  assert.equal(recipe.steps.length, 4);
  assert.deepEqual(recipe.steps.map(step => step.durationSeconds), [1500, 600, 60, null]);
  assert.match(recipe.steps[0].instruction, /350 °F \(180 °C\)/u);
  assert.match(recipe.steps[0].instruction, /until the tomatoes are soft/u);
  assert.equal(recipe.warnings.length, 0);
});

test('recognizes English headings, servings and numbered Step labels', () => {
  for (const heading of ['Directions', 'Instructions', 'Method', 'Preparation', 'Steps']) {
    const recipe = parseRecipeText(`Recipe title: Tomato toast\nServes 4 people\nReady in: 10 minutes\nIngredients: 4 slices bread; 2 tomatoes\n${heading}:\nStep 1: Toast the bread for 2 min.\nStep 2: Slice the tomatoes and serve.`);
    assert.equal(recipe.language, 'en');
    assert.equal(recipe.title, 'Tomato toast');
    assert.equal(recipe.servings, 4);
    assert.equal(recipe.totalMinutes, 10);
    assert.equal(recipe.steps.length, 2);
    assert.equal(recipe.steps[0].instruction, 'Toast the bread for 2 min.');
    assert.deepEqual(recipe.steps[1].ingredientIds, ['ingredient-2']);
  }
});

test('explicit total time wins regardless of metadata order and is never added twice', () => {
  for (const metadata of [
    'Total time: 30 minutes\nPrep time: 10 minutes\nCook time: 20 minutes',
    'Cooking time: 20 minutes\nTotal time: 30 minutes\nPreparation time: 10 minutes',
  ]) {
    const recipe = parseRecipeText(englishRecipe('1 egg', '1. Beat the egg for 30 seconds.', `Yield: 2 servings\n${metadata}`));
    assert.equal(recipe.servings, 2);
    assert.equal(recipe.totalMinutes, 30);
  }
  const sum = parseRecipeText(englishRecipe('1 egg', undefined, 'Servings: 2\nPrep time: 10 minutes\nCook time: 20 minutes'));
  assert.equal(sum.totalMinutes, 30);
  assert.ok(sum.warnings.some(warning => warning.includes('puede no incluir reposos')));
});

test('English quantities, fractions and units scale with readable singulars and decimal points', () => {
  const recipe = parseRecipeText(englishRecipe('1/2 cup milk\n1 1/2 cups flour\n¼ teaspoon salt\n1½ tablespoons oil\n2 cloves garlic\n1 pinch pepper\n2 oz cheese\n1 lb potatoes'));
  assert.deepEqual(recipe.ingredients.map(item => item.quantity), [.5, 1.5, .25, 1.5, 2, 1, 2, 1]);
  assert.deepEqual(recipe.ingredients.map(item => item.name), ['milk', 'flour', 'salt', 'oil', 'garlic', 'pepper', 'cheese', 'potatoes']);
  assert.equal(scaleIngredient(recipe.ingredients[0], 2, 3), '0.75 cups');
  assert.equal(scaleIngredient(recipe.ingredients[1], 3, 2), '1 cup');
  assert.equal(scaleIngredient(recipe.ingredients[2], 2, 4), '0.5 tsp');
  assert.equal(scaleIngredient(recipe.ingredients[3], 2, 4), '3 tbsp');
  assert.equal(scaleIngredient(recipe.ingredients[4], 2, 1), '1 clove');
  assert.equal(scaleIngredient(recipe.ingredients[5], 2, 2), '1 pinch');
  assert.equal(scaleIngredient(recipe.ingredients[6], 2, 4), '4 oz');
  assert.equal(scaleIngredient(recipe.ingredients[7], 2, 4), '2 lb');
});

test('accepts English metric spellings, compact measures and optional ingredients', () => {
  const recipe = parseRecipeText(englishRecipe('200g flour\n100 millilitres water\n1 kilogram potatoes\n2 leaves basil (optional)'));
  assert.deepEqual(recipe.ingredients.map(item => item.quantity), [200, 100, 1, 2]);
  assert.deepEqual(recipe.ingredients.map(item => item.unit), ['g', 'ml', 'kg', 'leaves']);
  assert.equal(recipe.ingredients[3].name, 'basil');
  assert.equal(recipe.ingredients[3].optional, true);
  assert.equal(scaleIngredient(recipe.ingredients[3], 2, 1), '1 leaf');
});

test('keeps to taste and as needed qualitative instead of inventing quantities', () => {
  const recipe = parseRecipeText(englishRecipe('Salt, to taste\nWater, as needed\nParsley'));
  assert.equal(scaleIngredient(recipe.ingredients[0], 2, 8), 'To taste');
  assert.equal(scaleIngredient(recipe.ingredients[1], 2, 8), 'As needed');
  assert.equal(scaleIngredient(recipe.ingredients[2], 2, 8), 'As written');
  assert.ok(recipe.warnings.some(warning => warning.startsWith('Hay un ingrediente sin cantidad')));
});

test('English ranges keep their original bounds and do not get a timer', () => {
  const recipe = parseRecipeText(englishRecipe('1 to 2 tbsp olive oil\n1.5–2 cups flour', '1. Bake at 400 °F for 15 to 20 minutes.\n2. Rest for between 5 and 10 minutes.'));
  assert.deepEqual(recipe.ingredients.map(item => item.quantity), [null, null]);
  assert.equal(scaleIngredient(recipe.ingredients[0], 2, 4), '1–2 tbsp');
  assert.equal(scaleIngredient(recipe.ingredients[1], 2, 4), '1.5–2 cups');
  assert.deepEqual(recipe.steps.map(item => item.durationSeconds), [null, null]);
  assert.equal(recipe.warnings.filter(warning => warning.includes('tiempo del paso')).length, 2);
});

test('understands English compound and fractional durations without confusing degrees', () => {
  const recipe = parseRecipeText(englishRecipe('1 loaf bread', '1. Preheat to 180 °C (350 °F).\n2. Bake for 1 hour and 20 minutes.\n3. Rest for 1 1/2 hours.\n4. Whisk for 30 seconds.\n5. Cook for 1.5 minutes.'));
  assert.deepEqual(recipe.steps.map(item => item.durationSeconds), [null, 4800, 5400, 30, 90]);
  assert.equal(recipe.steps[4].title, 'Cook for 1.5 minutes');
});

test('links English singulars and plurals with complete words, not oil inside boil', () => {
  const recipe = parseRecipeText(englishRecipe('2 tomatoes\n1 tbsp oil\n2 eggs\n1 cup berries\n2 leaves basil', '1. Slice the tomato.\n2. Boil the water.\n3. Beat the egg.\n4. Mash a berry.\n5. Add the basil.'));
  assert.deepEqual(recipe.steps.map(item => item.ingredientIds), [['ingredient-1'], [], ['ingredient-3'], ['ingredient-4'], ['ingredient-5']]);
});

test('infers an English unheaded list while warning about the inferred sections', () => {
  const recipe = parseRecipeText('Tomato toast\n2 slices bread\n1 tomato\n1. Toast the bread for 2 minutes.\n2. Slice the tomato and serve.');
  assert.equal(recipe.language, 'en');
  assert.equal(recipe.ingredients.length, 2);
  assert.equal(recipe.steps.length, 2);
  assert.ok(recipe.warnings.some(warning => warning.includes('ingredientes por sus cantidades')));
  assert.ok(recipe.warnings.some(warning => warning.includes('pasos por el formato')));
});

test('English section labels do not turn titles starting with Time into metadata', () => {
  const recipe = parseRecipeText('Timeless tomato soup\nServings: 2\nIngredients:\nFor the soup:\n2 tomatoes\nWater, as needed\nInstructions:\n1. Simmer the tomatoes until soft.');
  assert.equal(recipe.title, 'Timeless tomato soup');
  assert.equal(recipe.ingredients.length, 2);
  assert.equal(recipe.steps.length, 1);
  assert.equal(recipe.steps[0].durationSeconds, null);
});

test('English missing instructions and ambiguous servings remain visible warnings', () => {
  const recipe = parseRecipeText('Bread\nServes: 2–4 people\nIngredients:\n1 cup flour\nWater, as needed');
  assert.equal(recipe.steps.length, 0);
  assert.ok(recipe.warnings.some(warning => warning.includes('no se han inventado instrucciones')));
  assert.ok(recipe.warnings.some(warning => warning.includes('cantidad única reconocible')));
});

test('separate timed actions in one step are not silently merged into one countdown', () => {
  for (const instruction of [
    '1. Bake the tomatoes for 20 minutes. Meanwhile, boil pasta for 10 minutes.',
    '1. Hornea los tomates 20 minutos. Después deja reposar 10 minutos.',
  ]) {
    const recipe = parseRecipeText(englishRecipe('2 tomatoes', instruction));
    assert.equal(recipe.steps[0].durationSeconds, null);
    assert.ok(recipe.warnings.some(warning => warning.includes('tiempos para acciones diferentes')));
  }
  assert.equal(parseRecipeText(englishRecipe('2 tomatoes', '1. Bake for 1 hour and 20 minutes.')).steps[0].durationSeconds, 4800);
});
