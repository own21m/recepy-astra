/** Let a deliberate rightward drag open the recipe without taking vertical scroll. */
export function shouldCaptureRecipeOpening(dx: number, dy: number): boolean {
  return Number.isFinite(dx) && Number.isFinite(dy)
    && dx > 20 && dx > Math.abs(dy) * 1.6;
}

/** The recipe enters from the left and stays attached to the finger, even on reversal. */
export function recipeOpeningOffset(dx: number, width: number): number {
  if (!Number.isFinite(width) || width <= 0) return 0;
  if (!Number.isFinite(dx)) return -width;
  return Math.max(-width, Math.min(0, dx - width));
}

/** Distance alone decides: releasing an early, fast drag must still cancel it. */
export function shouldCompleteRecipeOpening(dx: number, width: number): boolean {
  return Number.isFinite(dx) && Number.isFinite(width) && width > 0
    && dx >= width * .35;
}
