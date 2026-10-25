export type PanelMotion = 'recipe' | 'comments' | 'default';

export function shouldCapturePanel(kind: PanelMotion, dx: number, dy: number): boolean {
  if (![dx, dy].every(Number.isFinite)) return false;
  return kind === 'recipe' ? dx > 14 && dx > Math.abs(dy) * 1.6
    : kind === 'comments' && dy > 8 && dy > Math.abs(dx) * 1.2;
}

export function shouldDismissPanel(distance: number, velocity: number): boolean {
  return Number.isFinite(distance) && Number.isFinite(velocity)
    && (distance > 90 || (distance > 24 && velocity > .65));
}
