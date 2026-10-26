/** Start an upward comments gesture on its trigger, leaving feed scrolling elsewhere. */
export function shouldCaptureCommentsOpening(dx: number, dy: number): boolean {
  return Number.isFinite(dx) && Number.isFinite(dy)
    && dy < -14 && -dy > Math.abs(dx) * 1.6;
}

/** The bottom sheet occupies 86% of the viewport and must travel its full height to hide. */
export function commentsPanelTravel(height: number, desktop = false): number {
  if (!Number.isFinite(height) || height <= 0) return 0;
  return Math.min(height * .86, desktop ? 1050 : Infinity);
}

/** Follow the finger from fully hidden to open; reversing follows the same path back. */
export function commentsOpeningOffset(dy: number, extent: number): number {
  if (!Number.isFinite(extent) || extent <= 0) return 0;
  if (!Number.isFinite(dy)) return extent;
  return Math.max(0, Math.min(extent, extent + dy));
}

/** A short fast drag still cancels: use the final distance, not its velocity or peak. */
export function shouldCompleteCommentsOpening(dy: number, extent: number): boolean {
  return Number.isFinite(dy) && Number.isFinite(extent) && extent > 0
    && -dy >= extent * .35;
}
