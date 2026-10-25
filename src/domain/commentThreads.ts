import type { Creator, OwnProfile, RecipeComment } from '../data/recipes';

export type ThreadComment = { comment: RecipeComment; depth: number; replyTo?: RecipeComment };

/** Keep replies beside their parent without losing old orphaned or malformed records. */
export function threadComments(comments: readonly RecipeComment[]): ThreadComment[] {
  const byId = new Map<string, RecipeComment>();
  for (const comment of comments) if (!byId.has(comment.id)) byId.set(comment.id, comment);
  const children = new Map<string, RecipeComment[]>();
  const roots: RecipeComment[] = [];
  for (const comment of byId.values()) {
    const parent = comment.parentId ? byId.get(comment.parentId) : undefined;
    if (!parent || parent.id === comment.id || parent.recipeId !== comment.recipeId) roots.push(comment);
    else children.set(parent.id, [...(children.get(parent.id) ?? []), comment]);
  }
  const result: ThreadComment[] = [];
  const visited = new Set<string>();
  const visit = (comment: RecipeComment, depth: number, replyTo?: RecipeComment) => {
    if (visited.has(comment.id)) return;
    visited.add(comment.id);
    result.push({ comment, depth, ...(replyTo ? { replyTo } : {}) });
    for (const child of children.get(comment.id) ?? []) visit(child, depth + 1, comment);
  };
  for (const root of roots) visit(root, 0);
  // A cycle has no root. Render each member once instead of hiding the conversation.
  for (const comment of byId.values()) visit(comment, 0);
  return result;
}

function stableAuthorId(author: string): string {
  let hash = 2166136261;
  for (const character of author.trim().toLowerCase()) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `commenter-${(hash >>> 0).toString(36)}`;
}

export function commentAuthor(comment: RecipeComment, profile: OwnProfile, creators: readonly Creator[] = []): Creator {
  if (comment.authorId === 'me') return { ...profile, id: 'me', followers: '0' };
  const known = creators.find(creator => comment.authorId ? creator.id === comment.authorId
    : creator.name === comment.author || creator.handle === comment.authorHandle);
  if (known) return known;
  const id = comment.authorId || stableAuthorId(comment.author);
  return {
    id,
    name: comment.author,
    handle: comment.authorHandle || `@${id}`,
    avatar: comment.avatar,
    bio: '',
    followers: '0',
  };
}
