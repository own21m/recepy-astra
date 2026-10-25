/** Local, deterministic parsing. Warnings expose uncertainty instead of inventing a recipe. */
export type RecipeLanguage = 'es' | 'en';
export type Ingredient = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string;
  original: string;
  optional?: boolean;
  language?: RecipeLanguage;
};

export type RecipeStep = {
  id: string;
  title: string;
  instruction: string;
  durationSeconds: number | null;
  ingredientIds: string[];
};

export type ParsedRecipe = {
  id: string;
  language: RecipeLanguage;
  title: string;
  description: string;
  servings: number;
  totalMinutes: number;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  warnings: string[];
  sourceText: string;
};

export const exampleRecipeText = `Rigatoni con tomate asado y burrata
Una salsa de tomate asado, pasta al dente y el final más cremoso.
Porciones: 2
Tiempo: 30 minutos

Ingredientes:
- 200 g de rigatoni
- 350 g de tomates cherry
- 1 burrata
- 3 dientes de ajo
- 3 cucharadas de aceite de oliva
- 8 hojas de albahaca fresca
- Sal y pimienta al gusto

Preparación:
1. Asa los tomates. Precalienta el horno a 220 °C. Pon los tomates y el ajo en una fuente con el aceite de oliva. Hornea durante 20 minutos.
2. Cuece la pasta. Cocina el rigatoni en agua con sal durante 10 minutos. Reserva un poco del agua de cocción antes de escurrir.
3. Une todos los sabores. Aplasta los tomates y el ajo. Mezcla con la pasta y un chorrito del agua reservada durante 2 minutos.
4. Sirve y disfruta. Abre la burrata sobre la pasta, añade la albahaca y termina con pimienta.`;

export const exampleRecipeTextEnglish = `Roasted tomato pasta
Sweet roasted tomatoes, tender pasta and a creamy finish.
Servings: 2
Prep time: 10 minutes
Cook time: 25 minutes
Total time: 35 minutes

Ingredients:
- 200 g rigatoni
- 350 g cherry tomatoes
- 3 cloves garlic
- 2 tbsp olive oil
- 1 burrata
- 8 leaves fresh basil
- Salt and pepper, to taste

Instructions:
1. Roast the tomatoes. Preheat the oven to 350 °F (180 °C). Place the tomatoes and garlic in a baking dish with the olive oil. Roast for 25 minutes, until the tomatoes are soft and their skins begin to split.
2. Cook the pasta. Bring a pot of salted water to a boil. Add the rigatoni and cook for 10 minutes, until tender but still firm in the centre. Reserve half a cup of the cooking water, then drain.
3. Combine. Mash the tomatoes and garlic. Add the pasta and stir for 1 minute. Add a little reserved water if the sauce is too thick.
4. Serve. Divide between two bowls. Tear the burrata over the pasta and finish with basil and pepper.`;

type Section = 'intro' | 'ingredients' | 'steps';
type QuantityMatch = { value: number; rest: string };
type RangeMatch = { label: string; rest: string };

const fractions: Record<string, number> = {
  '¼': .25, '½': .5, '¾': .75, '⅐': 1 / 7, '⅑': 1 / 9, '⅒': .1,
  '⅓': 1 / 3, '⅔': 2 / 3, '⅕': .2, '⅖': .4, '⅗': .6, '⅘': .8,
  '⅙': 1 / 6, '⅚': 5 / 6, '⅛': .125, '⅜': .375, '⅝': .625, '⅞': .875,
};
const fractionChars = Object.keys(fractions).join('');
const quantityPattern = new RegExp(`^(?:(\\d+)\\s+(\\d+)\\s*[/⁄]\\s*(\\d+)|(\\d+)\\s*[/⁄]\\s*(\\d+)|(\\d+(?:[.,]\\d+)?)\\s*([${fractionChars}])?|([${fractionChars}]))(?=\\s|$)`, 'u');
const rangePattern = /^(\d+(?:[.,]\d+)?)\s*(?:[-–—]|\s+(?:a|to)\s+)\s*(\d+(?:[.,]\d+)?)(?=\s|$)/u;
const imperative = /^(?:asa|as[aá]r|agrega|añade|anade|abre|bate|calienta|cocina|corta|cuece|deja|derrite|distribuye|dora|enfría|enfria|escurre|extiende|forma|fríe|frie|hierve|hornea|incorpora|lava|lleva|mezcla|monta|pela|pica|pon|precalienta|prepara|reparte|reserva|retira|saltea|sazona|sirve|sofríe|sofrie|tuesta|tritura|une|vierte|add|allow|bake|beat|blend|boil|bring|brush|chill|chop|coat|combine|cook|cover|cut|drain|drizzle|dust|fold|fry|garnish|grate|grease|grill|heat|knead|lay|leave|let|line|mash|melt|mix|peel|place|pour|preheat|reduce|remove|rest|rinse|roast|roll|rub|saute|sauté|season|serve|shred|sift|simmer|slice|sprinkle|stir|toast|toss|transfer|turn|whisk)\b/i;
const units: Array<[RegExp, string, string]> = [
  [/^(?:kilogramos?|kilograms?|kilos?|kg)\b\.?/iu, 'kg', 'kg'],
  [/^(?:miligramos?|milligrams?|mg)\b\.?/iu, 'mg', 'mg'],
  [/^(?:gramos?|grams?|grs?|g)\b\.?/iu, 'g', 'g'],
  [/^(?:mililitros?|millilit(?:er|re)s?|ml|cc)\b\.?/iu, 'ml', 'ml'],
  [/^(?:litros?|lit(?:er|re)s?|l)\b\.?/iu, 'l', 'l'],
  [/^(?:cucharaditas?|cditas?|cdtas?|cucharitas?|teaspoons?|tsps?|tsp)\b\.?/iu, 'cucharaditas', 'tsp'],
  [/^(?:cucharadas?|cdas?|tablespoons?|tbsps?|tbs)\b\.?/iu, 'cucharadas', 'tbsp'],
  [/^(?:tazas?|cups?)\b\.?/iu, 'tazas', 'cups'],
  [/^(?:onzas?|ounces?|oz)\b\.?/iu, 'oz', 'oz'],
  [/^(?:libras?|pounds?|lbs?)\b\.?/iu, 'lb', 'lb'],
  [/^(?:pizcas?|pinch(?:es)?)\b\.?/iu, 'pizcas', 'pinches'],
  [/^(?:dientes?|cloves?)\b\.?/iu, 'dientes', 'cloves'],
  [/^(?:hojas?|leaf|leaves)\b\.?/iu, 'hojas', 'leaves'],
  [/^(?:ramitas?|ramas?|sprigs?)\b\.?/iu, 'ramitas', 'sprigs'],
  [/^(?:lonchas?|slices?)\b\.?/iu, 'lonchas', 'slices'],
  [/^(?:rebanadas?)\b\.?/iu, 'rebanadas', 'slices'],
  [/^(?:latas?|cans?)\b\.?/iu, 'latas', 'cans'],
  [/^(?:paquetes?|packets?|packages?)\b\.?/iu, 'paquetes', 'packets'],
  [/^(?:unidad(?:es)?|uds?|u|pieces?|items?)\b\.?/iu, 'unidades', 'pieces'],
];
const timeUnits = 'horas?|hours?|hrs?|h|minutos?|minutes?|mins?|min|segundos?|seconds?|secs?|segs?|seg|sec|s';
const durationRange = new RegExp(`\\d+(?:[.,]\\d+)?\\s*(?:[-–—]|\\s+(?:a|to)\\s+)\\s*\\d+(?:[.,]\\d+)?\\s*(?:${timeUnits})\\b|\\bbetween\\s+\\d+(?:[.,]\\d+)?\\s+and\\s+\\d+(?:[.,]\\d+)?\\s*(?:${timeUnits})\\b`, 'iu');
const flexibleAmount = `(?:\\d+\\s+\\d+\\s*[/⁄]\\s*\\d+|\\d+\\s*[/⁄]\\s*\\d+|\\d+(?:[.,]\\d+)?\\s*[${fractionChars}]?|[${fractionChars}])`;
const durationPattern = new RegExp(`(?:^|[^\\p{L}\\d])(${flexibleAmount})\\s*(${timeUnits})\\b`, 'gu');

function fold(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function detectLanguage(text: string): RecipeLanguage {
  const normalized = fold(text);
  const english = normalized.match(/\b(?:ingredients|directions|instructions|method|servings|serves|yield|prep time|cook time|total time)\b/g)?.length ?? 0;
  const spanish = normalized.match(/\b(?:ingredientes|preparacion|elaboracion|instrucciones|pasos|porciones|raciones|comensales|tiempo)\b/g)?.length ?? 0;
  if (english !== spanish) return english > spanish ? 'en' : 'es';
  const englishActions = normalized.match(/\b(?:add|bake|cook|mix|chop|stir|serve|preheat|salt|pepper|flour|butter)\b/g)?.length ?? 0;
  const spanishActions = normalized.match(/\b(?:anade|hornea|cocina|mezcla|corta|sirve|precalienta|sal|pimienta|harina|mantequilla)\b/g)?.length ?? 0;
  return englishActions > spanishActions ? 'en' : 'es';
}

function stripBullet(text: string): string {
  return text.replace(/^\s*(?:[-*•▪◦]\s+|\[(?: |x|X)\]\s*)/u, '').trim();
}

function cleanLine(text: string): string {
  return stripBullet(text.replace(/^\s*#{1,6}\s*/, '').replace(/\*\*/g, '').trim());
}

function quantityAtStart(text: string): QuantityMatch | null {
  const match = text.match(quantityPattern);
  if (!match) return null;
  let value: number;
  if (match[1]) value = Number(match[1]) + Number(match[2]) / Number(match[3]);
  else if (match[4]) value = Number(match[4]) / Number(match[5]);
  else if (match[6]) value = Number(match[6].replace(',', '.')) + (fractions[match[7]] || 0);
  else value = fractions[match[8]];
  if (!Number.isFinite(value) || value < 0) return null;
  return { value, rest: text.slice(match[0].length).trim() };
}

function rangeAtStart(text: string, language: RecipeLanguage = 'es'): RangeMatch | null {
  const match = text.match(rangePattern);
  const separator = (value: string) => language === 'en' ? value.replace(',', '.') : value.replace('.', ',');
  return match ? { label: `${separator(match[1])}–${separator(match[2])}`, rest: text.slice(match[0].length).trim() } : null;
}

function extractUnit(text: string, language: RecipeLanguage): { unit: string; name: string } {
  for (const [pattern, spanish, english] of units) {
    const match = text.match(pattern);
    if (match) return { unit: language === 'en' ? english : spanish, name: text.slice(match[0].length).replace(/^\s+(?:de|of)\s+/iu, '').trim() };
  }
  return { unit: '', name: text.replace(/^(?:de|of)\s+/iu, '').trim() };
}

function ingredientFromLine(line: string, index: number, language: RecipeLanguage): Ingredient {
  const original = stripBullet(line.replace(/^\d+[.)]\s+(?=\d|[¼½¾⅓⅔])/u, ''));
  // Common copied recipes omit the space in "200g". Keep the original intact.
  const normalized = original.replace(/(\d)(kg|mg|g|ml|l|oz|lbs?)\b/giu, '$1 $2');
  const range = rangeAtStart(normalized, language);
  const quantity = range ? null : quantityAtStart(normalized);
  const remainder = range?.rest ?? quantity?.rest ?? normalized;
  const { unit, name } = extractUnit(remainder, language);
  const optional = /\b(?:opcional(?:es)?|optional)\b/i.test(name);
  return {
    id: `ingredient-${index + 1}`,
    name: name.replace(/\s*\(\s*(?:opcional(?:es)?|optional)\s*\)/iu, '').trim() || original,
    quantity: quantity?.value ?? null,
    unit,
    original,
    language,
    ...(optional ? { optional: true } : {}),
  };
}

/** Sum explicit time units, never oven temperatures. Ranges need a human choice. */
function hasSeparateDurations(text: string): boolean {
  const normalized = fold(text);
  const matches = [...normalized.matchAll(durationPattern)];
  return matches.some((match, index) => {
    if (index === 0) return false;
    const previous = matches[index - 1];
    const between = normalized.slice((previous.index ?? 0) + previous[0].length, match.index);
    // "1 hour and 20 minutes" is one duration. Different actions need their
    // own timers: summing "bake 20 minutes, then rest 10" hides that distinction.
    return between.replace(/\b(?:and|y)\b/gu, '').replace(/[\s,;+]/gu, '').length > 0;
  });
}

function readDuration(text: string): number | null {
  const normalized = fold(text);
  if (durationRange.test(normalized) || hasSeparateDurations(normalized)) return null;
  let seconds = 0;
  let found = false;
  for (const match of normalized.matchAll(durationPattern)) {
    const value = quantityAtStart(match[1].trim())?.value ?? 0;
    const factor = /^(?:h|hora|hr)/.test(match[2]) ? 3600 : /^(?:m|min)/.test(match[2]) ? 60 : 1;
    seconds += value * factor;
    found = true;
  }
  if (/\bmedia hora\b/u.test(normalized)) { seconds += 1800; found = true; }
  if (/\b(?:un )?cuarto de hora\b/u.test(normalized)) { seconds += 900; found = true; }
  if (/\bhalf an? hour\b/u.test(normalized)) { seconds += 1800; found = true; }
  if (/\b(?:a )?quarter of an? hour\b/u.test(normalized)) { seconds += 900; found = true; }
  return found && Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : null;
}

function titleForStep(instruction: string, index: number, language: RecipeLanguage): string {
  const firstSentence = instruction.split(/(?:[.!?](?=\s|$)|\n)/u)[0].trim();
  const colon = firstSentence.indexOf(':');
  if (colon > 0 && colon < 70) return firstSentence.slice(0, colon);
  if (firstSentence.length <= 70) return firstSentence || `${language === 'en' ? 'Step' : 'Paso'} ${index + 1}`;
  return `${firstSentence.split(/\s+/u).slice(0, 7).join(' ')}…`;
}

function ingredientLinks(instruction: string, ingredients: Ingredient[], language: RecipeLanguage): string[] {
  const normalized = fold(instruction);
  const stopWords = new Set(['de', 'del', 'la', 'el', 'las', 'los', 'una', 'un', 'y', 'al', 'gusto', 'fresco', 'fresca', 'frescos', 'frescas', 'rallado', 'rallada', 'picado', 'picada', 'maduro', 'madura', 'maduros', 'maduras', 'opcional', 'of', 'the', 'and', 'to', 'taste', 'as', 'needed', 'optional', 'fresh', 'dried', 'chopped', 'finely', 'roughly', 'minced', 'sliced', 'grated', 'shredded', 'ground', 'unsalted', 'salted', 'extra', 'virgin', 'ripe', 'large', 'small', 'medium', 'red', 'green', 'yellow', 'white', 'black', 'whole']);
  if (language === 'en') {
    const stem = (token: string) => token === 'leaves' ? 'leaf'
      : /ies$/u.test(token) ? token.slice(0, -3) + 'y'
      : /(?:oes|ches|shes|xes|sses)$/u.test(token) ? token.slice(0, -2)
      : token.length > 3 && token.endsWith('s') && !token.endsWith('ss') ? token.slice(0, -1) : token;
    const ingredientTokens = ingredients.map(ingredient => [...new Set((fold(ingredient.name).match(/[a-z]+/g) ?? []).filter(token => token.length >= 3 && !stopWords.has(token)).map(stem))]);
    const mentions = new Set((normalized.match(/[a-z]+/g) ?? []).map(stem));
    const owners = new Map<string, number>();
    ingredientTokens.forEach(tokens => tokens.forEach(token => owners.set(token, (owners.get(token) ?? 0) + 1)));
    return ingredients.filter((_, index) => {
      const tokens = ingredientTokens[index];
      return tokens.some(token => owners.get(token) === 1 && mentions.has(token))
        || tokens.length > 1 && tokens.every(token => mentions.has(token));
    }).map(ingredient => ingredient.id);
  }
  return ingredients.filter(ingredient => {
    const tokens = fold(ingredient.name).match(/[a-z]+/g) ?? [];
    const mainToken = tokens.find(token => token.length >= 3 && !stopWords.has(token));
    if (!mainToken) return false;
    const stem = mainToken.length > 4 && mainToken.endsWith('s') ? mainToken.slice(0, -1) : mainToken;
    const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const alternatives = `${escaped}(?:s|es)?`;
    return new RegExp(`\\b(?:${alternatives})\\b`, 'u').test(normalized);
  }).map(ingredient => ingredient.id);
}

function hashText(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) { hash ^= text.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(36);
}

/** Accept Spanish and English recipe layouts without translating or adding instructions. */
export function parseRecipeText(text: string): ParsedRecipe {
  const sourceText = typeof text === 'string' ? text.trim() : '';
  const language = detectLanguage(sourceText);
  const warnings: string[] = [];
  const lines = sourceText.replace(/\r\n?/g, '\n').split('\n');
  let section: Section = 'intro';
  let title = '';
  let servings: number | null = null;
  let declaredSeconds: number | null = null;
  let preparationSeconds: number | null = null;
  let cookingSeconds: number | null = null;
  let sawIngredientsHeading = false;
  let sawStepsHeading = false;
  const descriptions: string[] = [];
  const ingredientLines: string[] = [];
  const stepLines: string[] = [];

  for (const raw of lines) {
    const line = cleanLine(raw);
    if (!line) continue;
    const folded = fold(line);
    const titleMatch = line.match(/^(?:t[ií]tulo|nombre(?: de la receta)?|receta|(?:recipe\s+)?title|recipe name)\s*:\s*(.+)$/iu);
    if (titleMatch && section === 'intro') { title = titleMatch[1].trim(); continue; }
    const servingMatch = folded.match(/^(?:(?:porciones|raciones|personas|comensales|servings?|serves|yield)\s*:?\s*|para\s+)(\d+)\s*(?:personas|porciones|raciones|comensales|people|persons?|servings?|portions?)?[.!]?$/u);
    if (servingMatch) {
      const value = Number(servingMatch[1]);
      if (value >= 1 && value <= 1000) servings = value;
      else warnings.push('Las porciones indicadas no son válidas. Revísalas antes de cocinar.');
      continue;
    }
    if (/^(?:porciones|raciones|comensales|servings?|serves|yield)\b/u.test(folded)) {
      warnings.push('Las porciones o el rendimiento no tienen una cantidad única reconocible. Revísalos antes de ajustar ingredientes.');
      continue;
    }
    const timeMatch = folded.match(/^(tiempo(?: total| de preparacion| de coccion)?|duracion|total time|prep(?:aration)? time|cook(?:ing)? time|ready in|time)(?:\s*:\s*|\s+)(.+)$/u);
    if (timeMatch) {
      const duration = readDuration(timeMatch[2]);
      if (duration !== null) {
        if (/^(?:prep|tiempo de preparacion)/u.test(timeMatch[1])) preparationSeconds = duration;
        else if (/^(?:cook|tiempo de coccion)/u.test(timeMatch[1])) cookingSeconds = duration;
        else declaredSeconds = duration;
      } else warnings.push('No se pudo interpretar el tiempo indicado. Escríbelo con minutos u horas, sin intervalos.');
      continue;
    }
    const ingredientHeading = line.match(/^(?:ingredientes|ingredients|necesitas|lo que necesitas)\b(?:\s*\([^)]*\))?\s*:?(.*)$/iu);
    if (ingredientHeading) {
      section = 'ingredients'; sawIngredientsHeading = true;
      if (ingredientHeading[1].trim()) ingredientLines.push(...ingredientHeading[1].split(/;/u).map(part => part.trim()).filter(Boolean));
      continue;
    }
    const stepsHeading = line.match(/^(?:preparaci[oó]n|pasos?(?: a paso)?|instrucciones|elaboraci[oó]n|procedimiento|m[eé]todo|directions|instructions|method|preparation|steps)\b\s*:?(.*)$/iu);
    if (stepsHeading) {
      section = 'steps'; sawStepsHeading = true;
      if (stepsHeading[1].trim()) stepLines.push(stepsHeading[1].trim());
      continue;
    }
    const numberedStep = /^(?:(?:paso|step)\s+)?\d+\s*[.):\-]\s+\D/iu.test(line);
    const instruction = line.replace(/^(?:(?:paso|step)\s+)?\d+\s*[.):\-]\s*/iu, '').trim();
    // Recipe names such as "Toast" and "Roast chicken" also begin with verbs.
    // An unnumbered first heading without sentence punctuation is the title.
    if (section === 'intro' && !title && !numberedStep && !quantityAtStart(line) && !rangeAtStart(line) && !/[.!?]$/u.test(line)) {
      title = line; continue;
    }
    if ((section === 'ingredients' && (numberedStep || imperative.test(instruction))) || (section === 'intro' && imperative.test(instruction))) section = 'steps';
    if (section === 'intro' && (quantityAtStart(line) || rangeAtStart(line))) section = 'ingredients';
    if (section === 'ingredients') {
      if (/[:：]$/u.test(line) && !quantityAtStart(line)) continue; // Subheading such as "For the sauce:".
      ingredientLines.push(line); continue;
    }
    if (section === 'steps') {
      if (stepLines.length && !numberedStep && !/^[-*•▪◦]/u.test(raw.trim()) && /^(?:[a-záéíóúñ]|hasta\b|y\b|para\b)/u.test(instruction) && !imperative.test(instruction)) stepLines[stepLines.length - 1] += ` ${instruction}`;
      else stepLines.push(instruction);
      continue;
    }
    if (!title) title = line;
    else descriptions.push(line);
  }

  const ingredients = ingredientLines.map((line, index) => ingredientFromLine(line, index, language));
  const steps: RecipeStep[] = stepLines.filter(Boolean).map((instruction, index) => ({
    id: `step-${index + 1}`,
    title: titleForStep(instruction, index, language),
    instruction,
    durationSeconds: readDuration(instruction),
    ingredientIds: ingredientLinks(instruction, ingredients, language),
  }));
  if (!title) { title = 'Tu nueva receta'; warnings.push('Añade un título para identificar tu receta.'); }
  if (!ingredients.length) warnings.push('No se encontraron ingredientes. Añade una sección «Ingredientes», con uno por línea.');
  else if (!sawIngredientsHeading) warnings.push('Se detectaron ingredientes por sus cantidades. Revisa la lista antes de publicar.');
  if (!steps.length) warnings.push('No se encontraron pasos. Añade una sección «Preparación»; no se han inventado instrucciones.');
  else if (!sawStepsHeading) warnings.push('Se detectaron pasos por el formato del texto. Revisa dónde empieza y termina cada paso.');
  const ranges = ingredients.filter(ingredient => rangeAtStart(ingredient.original));
  if (ranges.length) warnings.push('Hay cantidades en forma de intervalo. Se conservan tal como las escribiste y no se escalan automáticamente.');
  const withoutQuantity = ingredients.filter(ingredient => ingredient.quantity === null && !rangeAtStart(ingredient.original) && !/al gusto|cantidad necesaria|c\/n|to taste|as needed/iu.test(ingredient.original));
  if (withoutQuantity.length) warnings.push(`${withoutQuantity.length === 1 ? 'Hay un ingrediente sin cantidad' : `Hay ${withoutQuantity.length} ingredientes sin cantidad`}. Se conserva el texto original para que puedas revisarlo.`);
  if (servings === null) { servings = 2; warnings.push('No se indican porciones. Se muestran 2 como referencia; confírmalas antes de ajustar cantidades.'); }
  const stepSeconds = steps.reduce((sum, step) => sum + (step.durationSeconds ?? 0), 0);
  const componentSeconds = preparationSeconds === null && cookingSeconds === null ? null : (preparationSeconds ?? 0) + (cookingSeconds ?? 0);
  const explicitSeconds = declaredSeconds ?? componentSeconds;
  const totalMinutes = explicitSeconds !== null ? Math.ceil(explicitSeconds / 60) : stepSeconds ? Math.ceil(stepSeconds / 60) : 0;
  if (declaredSeconds === null && componentSeconds !== null) warnings.push('El total suma los tiempos de preparación y cocción indicados; puede no incluir reposos u otras tareas.');
  if (explicitSeconds === null && stepSeconds) warnings.push('El tiempo total se estima sumando los tiempos escritos en los pasos; algunas tareas podrían hacerse a la vez.');
  else if (explicitSeconds === null) warnings.push('No hay un tiempo total reconocible. Puedes añadir «Tiempo: 25 minutos» o «Total time: 25 minutes».');
  steps.forEach((step, index) => {
    if (durationRange.test(step.instruction)) warnings.push(`El tiempo del paso ${index + 1} es un intervalo. Elige una duración antes de usar un temporizador.`);
    else if (hasSeparateDurations(step.instruction)) warnings.push(`El paso ${index + 1} contiene tiempos para acciones diferentes. Sepáralas en varios pasos para tener un temporizador por acción.`);
  });
  return { id: `recipe-${hashText(sourceText)}`, language, title, description: descriptions.join(' '), servings, totalMinutes, ingredients, steps, warnings: [...new Set(warnings)], sourceText };
}

function numberLabel(value: number, language: RecipeLanguage): string {
  return new Intl.NumberFormat(language, { maximumFractionDigits: 2, useGrouping: false }).format(value);
}

/** Display amount only. Render ingredient.name separately in the ingredient row. */
export function scaleIngredient(ingredient: Ingredient, baseServings: number, newServings: number): string {
  const language = ingredient.language ?? 'es';
  if (ingredient.quantity === null) {
    const range = rangeAtStart(ingredient.original, language);
    if (range) return [range.label, ingredient.unit].filter(Boolean).join(' ');
    if (/to taste/iu.test(ingredient.original)) return 'To taste';
    if (/as needed/iu.test(ingredient.original)) return 'As needed';
    return /al gusto|cantidad necesaria|c\/n/iu.test(ingredient.original) ? 'Al gusto' : language === 'en' ? 'As written' : 'Según receta';
  }
  const ratio = Number.isFinite(baseServings) && baseServings > 0 && Number.isFinite(newServings) && newServings > 0 ? newServings / baseServings : 1;
  const amount = ingredient.quantity * ratio;
  const singular: Record<string, string> = { cucharadas: 'cucharada', cucharaditas: 'cucharadita', tazas: 'taza', pizcas: 'pizca', dientes: 'diente', hojas: 'hoja', ramitas: 'ramita', lonchas: 'loncha', rebanadas: 'rebanada', latas: 'lata', paquetes: 'paquete', unidades: 'unidad', cups: 'cup', pinches: 'pinch', cloves: 'clove', leaves: 'leaf', sprigs: 'sprig', slices: 'slice', cans: 'can', packets: 'packet', pieces: 'piece' };
  const unit = Math.abs(amount - 1) < 1e-9 ? singular[ingredient.unit] ?? ingredient.unit : ingredient.unit;
  return [numberLabel(amount, language), unit].filter(Boolean).join(' ');
}

/** Countdown display, with hours when needed; invalid values never show NaN. */
export function formatDuration(seconds: number): string {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const remainder = value % 60;
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}` : `${minutes}:${String(remainder).padStart(2, '0')}`;
}
