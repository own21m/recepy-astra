export type MenuPoint = { x: number; y: number };
export type MenuRect<T extends string = string> = { id: T; x: number; y: number; width: number; height: number };

export function isInsideMenuRect(point: MenuPoint, rect: Omit<MenuRect, 'id'>, padding = 0): boolean {
  if (![point.x, point.y, rect.x, rect.y, rect.width, rect.height, padding].every(Number.isFinite)) return false;
  if (rect.width <= 0 || rect.height <= 0 || padding < 0) return false;
  return point.x >= rect.x - padding && point.x < rect.x + rect.width + padding
    && point.y >= rect.y - padding && point.y < rect.y + rect.height + padding;
}

export function menuTargetAt<T extends string>(point: MenuPoint, targets: readonly MenuRect<T>[]): T | null {
  return targets.find(rect => isInsideMenuRect(point, rect))?.id ?? null;
}

export function menuTargetsInBar<T extends string>(bar: Omit<MenuRect, 'id'>, ids: readonly T[]): MenuRect<T>[] {
  const horizontalInset = 9; // One border pixel plus eight pixels of row padding.
  if (!ids.length || ![bar.x, bar.y, bar.width, bar.height].every(Number.isFinite) || bar.width <= horizontalInset * 2 || bar.height <= 2) return [];
  const width = (bar.width - horizontalInset * 2) / ids.length;
  return ids.map((id, index) => ({ id, x: bar.x + horizontalInset + index * width, y: bar.y + 1, width, height: bar.height - 2 }));
}

export function resolveMenuRelease<T extends string>(point: MenuPoint, targets: readonly MenuRect<T>[], hasSlid: boolean):
  { kind: 'navigate'; target: T } | { kind: 'keep-open' } | { kind: 'cancel' } {
  if (![point.x, point.y].every(Number.isFinite)) return { kind: 'cancel' };
  // Expansion moves the destinations underneath the original touch. Navigation
  // requires a deliberate slide, not merely releasing a stationary long press.
  if (!hasSlid) return { kind: 'keep-open' };
  const target = menuTargetAt(point, targets);
  return target === null ? { kind: 'cancel' } : { kind: 'navigate', target };
}
