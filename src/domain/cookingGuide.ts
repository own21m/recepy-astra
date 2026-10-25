export type TechniqueHelp = { id: string; label: string; explanation: string };
export type StepGuide = {
  actions: string[];
  temperatures: string[];
  signals: string[];
  techniques: TechniqueHelp[];
};

const techniqueDefinitions: Array<TechniqueHelp & { pattern: RegExp }> = [
  { id: 'al-dente', label: 'Al dente', pattern: /\bal dente\b/iu, explanation: 'La pasta ofrece una ligera resistencia al morder. Prueba una pieza para comprobar la textura que pide la receta.' },
  { id: 'saute', label: 'Saltear', pattern: /\b(?:salte(?:a|ar|ando)|saut[eé](?:ing|ed)?)\b/iu, explanation: 'Cocinar en sartén con poca grasa, moviendo los ingredientes para repartir el calor. Mantén la intensidad de fuego indicada en la receta.' },
  { id: 'simmer', label: 'Cocción suave', pattern: /\b(?:a fuego (?:lento|bajo)|simmer(?:ing|ed)?)\b/iu, explanation: 'Una cocción suave evita un hervor fuerte. Si hay líquido, las burbujas son pequeñas y tranquilas; respeta el punto indicado en el paso.' },
  { id: 'fold', label: 'Movimientos envolventes', pattern: /\b(?:movimientos envolventes|fold(?:ing)?|incorpora suavemente)\b/iu, explanation: 'Pasa la espátula por el fondo y sube la mezcla hacia arriba con suavidad. Así se mezcla sin perder tanto aire.' },
  { id: 'whisk', label: 'Batir', pattern: /\b(?:bat(?:e|ir|iendo)|whisk(?:ing|ed)?)\b/iu, explanation: 'Mueve unas varillas para unir los ingredientes. La textura final depende del paso: mezclar no siempre significa montar o incorporar aire.' },
  { id: 'julienne', label: 'Cortar en juliana', pattern: /\b(?:juliana|julienne)\b/iu, explanation: 'Corta en tiras finas y de tamaño parecido para que se cocinen de forma uniforme.' },
  { id: 'preheat', label: 'Precalentar', pattern: /\b(?:precalient(?:a|e)|precalentar|preheat(?:ing|ed)?)\b/iu, explanation: 'Lleva el equipo a la temperatura que indica la receta antes de introducir la preparación.' },
  { id: 'reduce', label: 'Reducir', pattern: /\b(?:reduce|reducir|reducing)\b(?!\s+(?:(?:el|la|the)\s+)?(?:fuego|calor|heat|temperature))/iu, explanation: 'Deja que parte del líquido se evapore. La mezcla se concentra; usa la textura o cantidad final que describa la receta para decidir cuándo parar.' },
  { id: 'sear', label: 'Dorar', pattern: /\b(?:dor(?:a|ar)|sear(?:ing|ed)?)\b/iu, explanation: 'Busca el color en la superficie que describe la receta. El color exterior por sí solo no determina cómo está el interior.' },
  { id: 'emulsify', label: 'Emulsionar', pattern: /\b(?:emulsion(?:a|ar)|emulsif(?:y|ied|ying))\b/iu, explanation: 'Une líquidos que suelen separarse, como aceite y agua, mezclando mientras incorporas los ingredientes en el orden indicado.' },
];

function unique(items: string[]): string[] {
  return [...new Set(items.map(item => item.trim()).filter(Boolean))];
}

/** Surface only values and cues actually written by the author. No generated method. */
export function buildStepGuide(instruction: string): StepGuide {
  const text = instruction.trim();
  const actions = text ? text.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ])|;\s+/u).map(action => action.trim()).filter(Boolean) : [];
  const temperatures = unique([...text.matchAll(/(?:^|[^\d])(-?\d+(?:[.,]\d+)?\s*(?:°\s*[CF]\b|(?:grados?\s*(?:Celsius|Fahrenheit)|degrees?\s*(?:Celsius|Fahrenheit))))/giu)].map(match => match[1]));
  const signals = unique([...text.matchAll(/\b(?:hasta(?:\s+que)?|until)\s+[^.!?;\n]+/giu)].map(match => match[0]));
  const techniques = techniqueDefinitions.filter(technique => technique.pattern.test(text)).map(({ id, label, explanation }) => ({ id, label, explanation }));
  return { actions, temperatures, signals, techniques };
}

export function instructionWithoutTitle(instruction: string, title: string): string {
  if (instruction === title || instruction === title + '.') return '';
  return instruction.startsWith(title + '.') || instruction.startsWith(title + ':')
    ? instruction.slice(title.length + 1).trim() : instruction;
}
