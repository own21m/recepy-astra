import type { ParsedRecipe } from './recipeParser';

export type RecipeClarityHint = { id: string; title: string; detail: string; stepId?: string };

/** Editorial prompts for the author, never generated recipe instructions. */
export function reviewRecipeClarity(recipe: ParsedRecipe): RecipeClarityHint[] {
  const hints: RecipeClarityHint[] = [];
  const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const source = fold(recipe.sourceText);
  const temperature = /\b\d{2,3}(?:[.,]\d+)?\s*(?:°\s*)?[cf]\b|\b\d+\s*(?:grados|degrees)\b/;
  if (/\b(?:horno|hornea\w*|oven|bake\w*|baking)\b/.test(source) && !temperature.test(source)) {
    hints.push({ id: 'oven-temperature', title: 'Temperatura del horno', detail: 'Indica la temperatura y si el horno debe estar precalentado. La app no puede deducirlo.' });
  }
  const heating = /\b(?:cocina\w*|cuece|hierve|hornea\w*|saltea\w*|sofrie\w*|frie|dora\w*|asa|calienta\w*|cook\w*|bake\w*|roast\w*|boil\w*|simmer\w*|saute\w*|fry|grill\w*|heat\w*)\b/;
  const finishCue = /\b(?:hasta que|hasta estar|hasta dorar|cuando|al dente|until|once|when|golden|tender|softened|dorado\w*|tierno\w*|transparente\w*)\b/;
  const time = /\b\d+(?:[.,]\d+)?\s*(?:hours?|hrs?|h|minutes?|mins?|min|minutos?|seconds?|secs?|s|segundos?|horas?)\b/;
  for (const [index, step] of recipe.steps.entries()) {
    const instruction = fold(step.instruction);
    if (heating.test(instruction) && !step.durationSeconds && !time.test(instruction) && !finishCue.test(instruction)) {
      hints.push({ id: `finish-${step.id}`, stepId: step.id, title: `Cuándo parar · paso ${index + 1}`, detail: 'Añade cuánto dura o cómo se ve, huele o se siente cuando está listo. Ayudará a quien cocina por primera vez.' });
    }
  }
  return hints;
}
