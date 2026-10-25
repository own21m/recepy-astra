export type KeyboardViewport = { x: number; y: number; width: number; height: number };
export type KeyboardFrame = { screenX: number; screenY: number; width: number; height: number };

/** Both rectangles are in window coordinates, never relative to the sheet. */
export function keyboardOverlap(viewport: KeyboardViewport, keyboard: KeyboardFrame | null): number {
  if (!keyboard) return 0;
  if (![viewport.x, viewport.y, viewport.width, viewport.height, keyboard.screenX, keyboard.screenY, keyboard.width, keyboard.height].every(Number.isFinite)) return 0;
  if (viewport.width <= 0 || viewport.height <= 0 || keyboard.width <= 0 || keyboard.height <= 0) return 0;
  const right = Math.min(viewport.x + viewport.width, keyboard.screenX + keyboard.width);
  const left = Math.max(viewport.x, keyboard.screenX);
  if (right <= left) return 0;
  const bottom = viewport.y + viewport.height;
  // A floating/undocked keyboard does not cover the bottom composer. An already
  // resized modal also produces zero, so the keyboard is never counted twice.
  if (keyboard.screenY + keyboard.height < bottom - 1) return 0;
  return Math.min(viewport.height, Math.max(0, bottom - keyboard.screenY));
}
