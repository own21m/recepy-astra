import assert from 'node:assert/strict';
import test from 'node:test';
import { commentAuthor, threadComments } from './commentThreads.ts';
import type { Creator, OwnProfile, RecipeComment } from '../data/recipes';

const profile: OwnProfile = { name: 'Juan nuevo', handle: '@juan.nuevo', avatar: 'new-avatar', bio: 'Nueva bio' };
const comment = (id: string, parentId?: string): RecipeComment => ({ id, recipeId: 'pasta', author: 'María', avatar: 'avatar', text: id, time: 'Ahora', ...(parentId ? { parentId } : {}) });

test('orders replies under their parent even when replies arrive first', () => {
  const result = threadComments([comment('reply', 'parent'), comment('other'), comment('parent'), comment('nested', 'reply')]);
  assert.deepEqual(result.map(item => [item.comment.id, item.depth]), [['other', 0], ['parent', 0], ['reply', 1], ['nested', 2]]);
  assert.equal(result[3].replyTo?.id, 'reply');
});
test('keeps orphan replies visible and rejects cross-recipe nesting', () => {
  const other = { ...comment('other'), recipeId: 'tacos' };
  const result = threadComments([other, comment('orphan', 'missing'), comment('cross', 'other')]);
  assert.deepEqual(result.map(item => item.depth), [0, 0, 0]);
});
test('renders each cycle member and duplicate id only once', () => {
  const result = threadComments([comment('a', 'b'), comment('b', 'a'), comment('a'), comment('self', 'self')]);
  assert.equal(result.length, 3);
  assert.deepEqual(new Set(result.map(item => item.comment.id)), new Set(['a', 'b', 'self']));
});
test('own comments use the latest profile rather than stale snapshots', () => {
  const result = commentAuthor({ ...comment('own'), authorId: 'me', author: 'Juan anterior' }, profile);
  assert.deepEqual(result, { ...profile, id: 'me', followers: '0' });
});
test('known creator id wins over a name snapshot', () => {
  const creator: Creator = { id: 'lucia', name: 'Lucía', handle: '@lucia', avatar: 'a', bio: 'b', followers: '2' };
  assert.equal(commentAuthor({ ...comment('one'), authorId: 'lucia' }, profile, [creator]), creator);
});
test('legacy author gets stable identity without using avatar as identity', () => {
  const first = commentAuthor(comment('one'), profile);
  const second = commentAuthor({ ...comment('two'), avatar: 'different-avatar' }, profile);
  assert.equal(first.id, second.id);
  assert.notEqual(first.id, commentAuthor({ ...comment('three'), author: 'Otra persona' }, profile).id);
});
