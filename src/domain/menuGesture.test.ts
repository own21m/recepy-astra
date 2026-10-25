import test from 'node:test';
import assert from 'node:assert/strict';
import { isInsideMenuRect, menuTargetAt, menuTargetsInBar, resolveMenuRelease } from './menuGesture.ts';

const targets = ['feed', 'explore', 'create', 'saved', 'profile'].map((id, index) => ({ id, x: 24 + index * 68, y: 758, width: 68, height: 64 }));

test('identifies all five destinations using absolute window coordinates', () => {
  targets.forEach(rect => assert.equal(menuTargetAt({ x: rect.x + 34, y: rect.y + 32 }, targets), rect.id));
});

test('shared target boundary belongs to exactly the following destination', () => {
  assert.equal(menuTargetAt({ x: 92, y: 790 }, targets), 'explore');
  assert.equal(menuTargetAt({ x: 364, y: 790 }, targets), null);
});

test('moving above or below the transformed bar selects nothing', () => {
  assert.equal(menuTargetAt({ x: 194, y: 740 }, targets), null);
  assert.equal(menuTargetAt({ x: 194, y: 830 }, targets), null);
});

test('sliding then releasing over a destination navigates only there', () => {
  assert.deepEqual(resolveMenuRelease({ x: 330, y: 790 }, targets, true), { kind: 'navigate', target: 'profile' });
});

test('expanding underneath a stationary finger does not accidentally select the centre item', () => {
  assert.equal(menuTargetAt({ x: 194, y: 790 }, targets), 'create');
  assert.deepEqual(resolveMenuRelease({ x: 194, y: 790 }, targets, false), { kind: 'keep-open' });
});

test('sliding then releasing outside the bar cancels rather than navigating', () => {
  assert.deepEqual(resolveMenuRelease({ x: 5, y: 790 }, targets, true), { kind: 'cancel' });
  assert.deepEqual(resolveMenuRelease({ x: 194, y: 740 }, targets, true), { kind: 'cancel' });
});

test('window resizing is handled by the latest measured target bounds', () => {
  const resized = targets.map(rect => ({ ...rect, x: rect.x + 300, y: rect.y - 200 }));
  assert.equal(menuTargetAt({ x: 630, y: 590 }, resized), 'profile');
  assert.equal(menuTargetAt({ x: 330, y: 790 }, resized), null);
});

test('invalid or zero sized measurements cannot accidentally select an item', () => {
  assert.equal(isInsideMenuRect({ x: 1, y: 1 }, { x: 0, y: 0, width: 0, height: 50 }), false);
  assert.equal(isInsideMenuRect({ x: NaN, y: 1 }, targets[0]), false);
  assert.equal(menuTargetAt({ x: Infinity, y: 790 }, targets), null);
  assert.deepEqual(resolveMenuRelease({ x: NaN, y: 790 }, targets, false), { kind: 'cancel' });
});

test('rapid slides use final bar geometry before expansion measurements settle', () => {
  const finalTargets = menuTargetsInBar({ x: 16, y: 758, width: 358, height: 66 }, ['feed', 'explore', 'create', 'saved', 'profile']);
  assert.deepEqual(resolveMenuRelease({ x: 332, y: 789 }, finalTargets, true), { kind: 'navigate', target: 'profile' });
  assert.deepEqual(resolveMenuRelease({ x: 195, y: 803 }, finalTargets, false), { kind: 'keep-open' });
  assert.deepEqual(resolveMenuRelease({ x: 332, y: 740 }, finalTargets, true), { kind: 'cancel' });
  assert.deepEqual(menuTargetsInBar({ x: 0, y: 0, width: 0, height: 66 }, ['feed']), []);
});
