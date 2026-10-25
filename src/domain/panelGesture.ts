export type PanelMotion = 'recipe' | 'comments' | 'default';

export function shouldCapturePanel(kind: PanelMotion, dx: number, dy: number): boolean {
  if (![dx, dy].every(Number.isFinite)) return false;
  return kind === 'recipe' ? dx < -14 && -dx > Math.abs(dy) * 1.6
    : kind === 'comments' && dy > 8 && dy > Math.abs(dx) * 1.2;
}

/** Track the finger only toward the panel's own exit, without overshooting it. */
export function clampPanelOffset(kind: PanelMotion, rawOffset: number, extent: number): number {
  if (![rawOffset, extent].every(Number.isFinite) || extent <= 0 || kind === 'default') return 0;
  const distance = Math.min(extent, Math.max(0, kind === 'recipe' ? -rawOffset : rawOffset));
  return kind === 'recipe' ? -distance || 0 : distance;
}

export function shouldDismissPanel(distance: number, velocity: number): boolean {
  return Number.isFinite(distance) && Number.isFinite(velocity)
    && (distance > 90 || (distance > 24 && velocity > .65));
}
