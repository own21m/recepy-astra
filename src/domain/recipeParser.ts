/** Local, deterministic parsing. Warnings expose uncertainty instead of inventing a recipe. */
export type Ingredient = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string;
  original: string;
  optional?: boolean;
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
const rangePattern = /^(\d+(?:[.,]\d+)?)\s*(?:[-–—]|\s+a\s+)\s*(\d+(?:[.,]\d+)?)(?=\s|$)/u;
const imperative = /^(?:asa|as[aá]r|agrega|añade|anade|abre|bate|calienta|cocina|corta|cuece|deja|derrite|distribuye|dora|enfría|enfria|escurre|extiende|forma|fríe|frie|hierve|hornea|incorpora|lava|lleva|mezcla|monta|pela|pica|pon|precalienta|prepara|reparte|reserva|retira|saltea|sazona|sirve|sofríe|sofrie|tuesta|tritura|une|vierte)\b/i;
const units: Array<[RegExp, string]> = [
  [/^(?:kilogramos?|kilos?|kg)\b\.?/iu, 'kg'],
  [/^(?:miligramos?|mg)\b\.?/iu, 'mg'],
  [/^(?:gramos?|grs?|g)\b\.?/iu, 'g'],
  [/^(?:mililitros?|ml|cc)\b\.?/iu, 'ml'],
  [/^(?:litros?|l)\b\.?/iu, 'l'],
  [/^(?:cucharaditas?|cditas?|cdtas?|cucharitas?|tsp)\b\.?/iu, 'cucharaditas'],
  [/^(?:cucharadas?|cdas?|tbsp)\b\.?/iu, 'cucharadas'],
  [/^(?:tazas?|cups?)\b\.?/iu, 'tazas'],
  [/^(?:pizcas?)\b\.?/iu, 'pizcas'],
  [/^(?:dientes?)\b\.?/iu, 'dientes'],
  [/^(?:hojas?)\b\.?/iu, 'hojas'],
  [/^(?:ramitas?|ramas?)\b\.?/iu, 'ramitas'],
  [/^(?:lonchas?)\b\.?/iu, 'lonchas'],
  [/^(?:rebanadas?)\b\.?/iu, 'rebanadas'],
  [/^(?:latas?)\b\.?/iu, 'latas'],
  [/^(?:paquetes?)\b\.?/iu, 'paquetes'],
  [/^(?:unidad(?:es)?|uds?|u)\b\.?/iu, 'unidades'],
];

function fold(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
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

function rangeAtStart(text: string): RangeMatch | null {
  const match = text.match(rangePattern);
  return match ? { label: `${match[1].replace('.', ',')}–${match[2].replace('.', ',')}`, rest: text.slice(match[0].length).trim() } : null;
}

function extractUnit(text: string): { unit: string; name: string } {
  for (const [pattern, unit] of units) {
    const match = text.match(pattern);
    if (match) return { unit, name: text.slice(match[0].length).replace(/^\s+de\s+/iu, '').trim() };
  }
  return { unit: '', name: text.replace(/^de\s+/iu, '').trim() };
}

function ingredientFromLine(line: string, index: number): Ingredient {
  const original = stripBullet(line.replace(/^\d+[.)]\s+(?=\d|[¼½¾⅓⅔])/u, ''));
  const range = rangeAtStart(original);
  const quantity = range ? null : quantityAtStart(original);
  const remainder = range?.rest ?? quantity?.rest ?? original;
  const { unit, name } = extractUnit(remainder);
  const optional = /\bopcional(?:es)?\b/i.test(name);
  return {
    id: `ingredient-${index + 1}`,
    name: name.replace(/\s*\(\s*opcional(?:es)?\s*\)/iu, '').trim() || original,
    quantity: quantity?.value ?? null,
    unit,
    original,
    ...(optional ? { optional: true } : {}),
  };
}

/** Sum explicit time units, never oven temperatures. Ranges need a human choice. */
function readDuration(text: string): number | null {
  const normalized = fold(text);
  if (/\d+\s*(?:[-–—]|\s+a\s+)\s*\d+\s*(?:horas?|h|minutos?|mins?|min|segundos?|segs?|seg)\b/u.test(normalized)) return null;
  const pattern = /\b(\d+(?:[.,]\d+)?)\s*(horas?|hrs?|h|minutos?|mins?|min|segundos?|segs?|seg|s)\b/gu;
  let seconds = 0;
  let found = false;
  for (const match of normalized.matchAll(pattern)) {
    const value = Number(match[1].replace(',', '.'));
    const factor = /^(?:h|hora|hr)/.test(match[2]) ? 3600 : /^(?:m|min)/.test(match[2]) ? 60 : 1;
    seconds += value * factor;
    found = true;
  }
  if (/\bmedia hora\b/u.test(normalized)) { seconds += 1800; found = true; }
  if (/\b(?:un )?cuarto de hora\b/u.test(normalized)) { seconds += 900; found = true; }
  return found && Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : null;
}

function titleForStep(instruction: string, index: number): string {
  const firstSentence = instruction.split(/[.!?\n]/u)[0].trim();
  const colon = firstSentence.indexOf(':');
  if (colon > 0 && colon < 70) return firstSentence.slice(0, colon);
  if (firstSentence.length <= 70) return firstSentence || `Paso ${index + 1}`;
  return `${firstSentence.split(/\s+/u).slice(0, 7).join(' ')}…`;
}

function ingredientLinks(instruction: string, ingredients: Ingredient[]): string[] {
  const normalized = fold(instruction);
  const stopWords = new Set(['de', 'del', 'la', 'el', 'las', 'los', 'una', 'un', 'y', 'al', 'gusto', 'fresco', 'fresca', 'frescos', 'frescas', 'rallado', 'rallada', 'picado', 'picada', 'maduro', 'madura', 'maduros', 'maduras', 'opcional']);
  return ingredients.filter(ingredient => {
    const tokens = fold(ingredient.name).match(/[a-z]+/g) ?? [];
    const mainToken = tokens.find(token => token.length >= 3 && !stopWords.has(token));
    if (!mainToken) return false;
    const stem = mainToken.length > 4 && mainToken.endsWith('s') ? mainToken.slice(0, -1) : mainToken;
    const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}(?:s|es)?\\b`, 'u').test(normalized);
  }).map(ingredient => ingredient.id);
}

function hashText(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) { hash ^= text.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(36);
}

/** Accept common Spanish recipe layouts. It is intentionally a parser, not an AI model. */
export function parseRecipeText(text: string): ParsedRecipe {
  const sourceText = typeof text === 'string' ? text.trim() : '';
  const warnings: string[] = [];
  const lines = sourceText.replace(/\r\n?/g, '\n').split('\n');
  let section: Section = 'intro';
  let title = '';
  let servings: number | null = null;
  let declaredMinutes: number | null = null;
  let sawIngredientsHeading = false;
  let sawStepsHeading = false;
  const descriptions: string[] = [];
  const ingredientLines: string[] = [];
  const stepLines: string[] = [];

  for (const raw of lines) {
    const line = cleanLine(raw);
    if (!line) continue;
    const folded = fold(line);
    const titleMatch = line.match(/^(?:t[ií]tulo|nombre(?: de la receta)?|receta)\s*:\s*(.+)$/iu);
    if (titleMatch && section === 'intro') { title = titleMatch[1].trim(); continue; }
    const servingMatch = folded.match(/^(?:(?:porciones|raciones|personas|comensales)\s*:?\s*|para\s+)(\d+)\s*(?:personas|porciones|raciones|comensales)?[.!]?$/u);
    if (servingMatch) {
      const value = Number(servingMatch[1]);
      if (value >= 1 && value <= 1000) servings = value;
      else warnings.push('Las porciones indicadas no son válidas. Revísalas antes de cocinar.');
      continue;
    }
    const timeMatch = folded.match(/^(?:tiempo(?: total| de preparacion| de coccion)?|duracion)\s*:\s*(.+)$/u);
    if (timeMatch) {
      const duration = readDuration(timeMatch[1]);
      if (duration !== null) declaredMinutes = Math.ceil(duration / 60);
      else warnings.push('No se pudo interpretar el tiempo total. Escríbelo con minutos u horas.');
      continue;
    }
    const ingredientHeading = line.match(/^(?:ingredientes(?:\s*\([^)]*\))?|necesitas|lo que necesitas)\s*:?(.*)$/iu);
    if (ingredientHeading) {
      section = 'ingredients'; sawIngredientsHeading = true;
      if (ingredientHeading[1].trim()) ingredientLines.push(...ingredientHeading[1].split(/;/u).map(part => part.trim()).filter(Boolean));
      continue;
    }
    const stepsHeading = line.match(/^(?:preparaci[oó]n|pasos?(?: a paso)?|instrucciones|elaboraci[oó]n|procedimiento|m[eé]todo)\s*:?(.*)$/iu);
    if (stepsHeading) {
      section = 'steps'; sawStepsHeading = true;
      if (stepsHeading[1].trim()) stepLines.push(stepsHeading[1].trim());
      continue;
    }
    const numberedStep = /^\d+[.)]\s+\D/u.test(line);
    const instruction = line.replace(/^(?:paso\s+)?\d+\s*[.):\-]\s*/iu, '').trim();
    if ((section === 'ingredients' && (numberedStep || imperative.test(instruction))) || (section === 'intro' && imperative.test(instruction))) section = 'steps';
    if (section === 'intro' && (quantityAtStart(line) || rangeAtStart(line))) section = 'ingredients';
    if (section === 'ingredients') { ingredientLines.push(line); continue; }
    if (section === 'steps') {
      if (stepLines.length && !numberedStep && !/^[-*•▪◦]/u.test(raw.trim()) && /^(?:[a-záéíóúñ]|hasta\b|y\b|para\b)/u.test(instruction) && !imperative.test(instruction)) stepLines[stepLines.length - 1] += ` ${instruction}`;
      else stepLines.push(instruction);
      continue;
    }
    if (!title) title = line;
    else descriptions.push(line);
  }

  const ingredients = ingredientLines.map(ingredientFromLine);
  const steps: RecipeStep[] = stepLines.filter(Boolean).map((instruction, index) => ({
    id: `step-${index + 1}`,
    title: titleForStep(instruction, index),
    instruction,
    durationSeconds: readDuration(instruction),
    ingredientIds: ingredientLinks(instruction, ingredients),
  }));
  if (!title) { title = 'Tu nueva receta'; warnings.push('Añade un título para identificar tu receta.'); }
  if (!ingredients.length) warnings.push('No se encontraron ingredientes. Añade una sección «Ingredientes», con uno por línea.');
  else if (!sawIngredientsHeading) warnings.push('Se detectaron ingredientes por sus cantidades. Revisa la lista antes de publicar.');
  if (!steps.length) warnings.push('No se encontraron pasos. Añade una sección «Preparación»; no se han inventado instrucciones.');
  else if (!sawStepsHeading) warnings.push('Se detectaron pasos por el formato del texto. Revisa dónde empieza y termina cada paso.');
  const ranges = ingredients.filter(ingredient => rangeAtStart(ingredient.original));
  if (ranges.length) warnings.push('Hay cantidades en forma de intervalo. Se conservan tal como las escribiste y no se escalan automáticamente.');
  const withoutQuantity = ingredients.filter(ingredient => ingredient.quantity === null && !rangeAtStart(ingredient.original) && !/al gusto|cantidad necesaria|c\/n/iu.test(ingredient.original));
  if (withoutQuantity.length) warnings.push(`${withoutQuantity.length === 1 ? 'Hay un ingrediente sin cantidad' : `Hay ${withoutQuantity.length} ingredientes sin cantidad`}. Se conserva el texto original para que puedas revisarlo.`);
  if (servings === null) { servings = 2; warnings.push('No se indican porciones. Se muestran 2 como referencia; confírmalas antes de ajustar cantidades.'); }
  const stepSeconds = steps.reduce((sum, step) => sum + (step.durationSeconds ?? 0), 0);
  const totalMinutes = declaredMinutes ?? (stepSeconds ? Math.ceil(stepSeconds / 60) : 0);
  if (declaredMinutes === null && stepSeconds) warnings.push('El tiempo total se estima sumando los tiempos escritos en los pasos; algunas tareas podrían hacerse a la vez.');
  else if (declaredMinutes === null) warnings.push('No hay un tiempo total reconocible. Puedes añadir «Tiempo: 25 minutos».');
  steps.forEach((step, index) => {
    if (/\d+\s*(?:[-–—]|\s+a\s+)\s*\d+\s*(?:horas?|h|minutos?|mins?|min|segundos?|segs?|seg)\b/iu.test(step.instruction)) warnings.push(`El tiempo del paso ${index + 1} es un intervalo. Elige una duración antes de usar un temporizador.`);
  });
  return { id: `recipe-${hashText(sourceText)}`, title, description: descriptions.join(' '), servings, totalMinutes, ingredients, steps, warnings: [...new Set(warnings)], sourceText };
}

function numberLabel(value: number): string {
  return new Intl.NumberFormat('es', { maximumFractionDigits: 2, useGrouping: false }).format(value);
}

/** Display amount only. Render ingredient.name separately in the ingredient row. */
export function scaleIngredient(ingredient: Ingredient, baseServings: number, newServings: number): string {
  if (ingredient.quantity === null) {
    const range = rangeAtStart(ingredient.original);
    if (range) return [range.label, ingredient.unit].filter(Boolean).join(' ');
    return /al gusto|cantidad necesaria|c\/n/iu.test(ingredient.original) ? 'Al gusto' : 'Según receta';
  }
  const ratio = Number.isFinite(baseServings) && baseServings > 0 && Number.isFinite(newServings) && newServings > 0 ? newServings / baseServings : 1;
  const amount = ingredient.quantity * ratio;
  const singular: Record<string, string> = { cucharadas: 'cucharada', cucharaditas: 'cucharadita', tazas: 'taza', pizcas: 'pizca', dientes: 'diente', hojas: 'hoja', ramitas: 'ramita', lonchas: 'loncha', rebanadas: 'rebanada', latas: 'lata', paquetes: 'paquete', unidades: 'unidad' };
  const unit = Math.abs(amount - 1) < 1e-9 ? singular[ingredient.unit] ?? ingredient.unit : ingredient.unit;
  return [numberLabel(amount), unit].filter(Boolean).join(' ');
}

/** Countdown display, with hours when needed; invalid values never show NaN. */
export function formatDuration(seconds: number): string {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const remainder = value % 60;
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}` : `${minutes}:${String(remainder).padStart(2, '0')}`;
}
