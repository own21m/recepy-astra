import AsyncStorage from '@react-native-async-storage/async-storage';
import { ownDefault } from './data/recipes';
import type { Creator, OwnProfile, RecipeComment, SocialRecipe } from './data/recipes';

export type AppPreferences = {
  autoplay: boolean;
  reducedMotion: boolean;
  haptics: boolean;
};

export type CookingProgress = {
  checked: string[];
  completed: string[];
  servings: number;
  stepIndex: number;
  timer?: {
    stepId: string;
    endAt: number | null;
    remaining: number;
    running: boolean;
  };
};

export type StoredState = {
  profile: OwnProfile;
  saved: string[];
  liked: string[];
  likedComments: string[];
  following: string[];
  comments: RecipeComment[];
  posts: SocialRecipe[];
  preferences: AppPreferences;
  cooking: Record<string, CookingProgress>;
};

const STORAGE_KEY = 'recepy:native:v1';
let pendingWrite: Promise<void> = Promise.resolve();

export function createInitialState(): StoredState {
  return {
    profile: { ...ownDefault },
    saved: [],
    liked: [],
    likedComments: [],
    following: [],
    comments: [],
    posts: [],
    preferences: { autoplay: true, reducedMotion: false, haptics: true },
    cooking: {},
  };
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string';
}

function isNonEmptyText(value: unknown): value is string {
  return isText(value) && value.trim().length > 0;
}

function stringIds(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter(isNonEmptyText))] : [];
}

function nonNegativeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

function parseProfile(value: unknown, fallback: OwnProfile): OwnProfile {
  if (!isRecord(value)) return { ...fallback };
  return {
    name: isNonEmptyText(value.name) ? value.name : fallback.name,
    handle: isNonEmptyText(value.handle) ? value.handle : fallback.handle,
    bio: isText(value.bio) ? value.bio : fallback.bio,
    avatar: isNonEmptyText(value.avatar) ? value.avatar : fallback.avatar,
  };
}

function parseCreator(value: unknown): Creator | null {
  if (!isRecord(value) || !isNonEmptyText(value.id) || !isNonEmptyText(value.name)
    || !isNonEmptyText(value.handle) || !isNonEmptyText(value.avatar)) return null;
  return {
    id: value.id,
    name: value.name,
    handle: value.handle,
    avatar: value.avatar,
    bio: isText(value.bio) ? value.bio : '',
    followers: isText(value.followers) ? value.followers : '0',
  };
}

function parseImage(value: unknown): SocialRecipe['image'] | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return value;
  if (isRecord(value) && isNonEmptyText(value.uri)) return { uri: value.uri };
  if (Array.isArray(value)) {
    const images = value.filter(isRecord).filter(image => isNonEmptyText(image.uri));
    if (images.length > 0) return images.map(image => ({ uri: image.uri as string }));
  }
  return null;
}

function parsePost(value: unknown): SocialRecipe | null {
  if (!isRecord(value) || !isNonEmptyText(value.id) || !isNonEmptyText(value.title)
    || !isNonEmptyText(value.rawText)) return null;
  const author = parseCreator(value.author);
  const image = parseImage(value.image);
  if (!author || image === null) return null;
  return {
    id: value.id,
    title: value.title,
    subtitle: isText(value.subtitle) ? value.subtitle : '',
    description: isText(value.description) ? value.description : '',
    author,
    image,
    ...(isText(value.imageCredit) ? { imageCredit: value.imageCredit } : {}),
    ...(typeof value.video === 'number' && Number.isSafeInteger(value.video) && value.video > 0
      ? { video: value.video } : {}),
    likes: nonNegativeNumber(value.likes),
    comments: nonNegativeNumber(value.comments),
    tags: stringIds(value.tags),
    rawText: value.rawText,
  };
}

function parseComment(value: unknown): RecipeComment | null {
  if (!isRecord(value) || !isNonEmptyText(value.id) || !isNonEmptyText(value.recipeId)
    || !isNonEmptyText(value.author) || !isNonEmptyText(value.text)) return null;
  return {
    id: value.id,
    recipeId: value.recipeId,
    author: value.author,
    avatar: isNonEmptyText(value.avatar) ? value.avatar : ownDefault.avatar,
    text: value.text,
    time: isText(value.time) ? value.time : 'Ahora',
    authorId: isNonEmptyText(value.authorId) ? value.authorId : 'me',
    ...(isNonEmptyText(value.authorHandle) ? { authorHandle: value.authorHandle } : {}),
    ...(isNonEmptyText(value.parentId) && value.parentId !== value.id ? { parentId: value.parentId } : {}),
    likes: nonNegativeNumber(value.likes),
  };
}

function parseCooking(value: unknown): StoredState['cooking'] {
  if (!isRecord(value)) return {};
  const entries: [string, CookingProgress][] = [];
  for (const [id, progress] of Object.entries(value)) {
    if (!id.trim() || ['__proto__', 'prototype', 'constructor'].includes(id) || !isRecord(progress)) continue;
    const timer = isRecord(progress.timer) && isNonEmptyText(progress.timer.stepId) ? progress.timer : null;
    const endAt = timer && typeof timer.endAt === 'number' && Number.isFinite(timer.endAt) && timer.endAt >= 0
      ? timer.endAt : null;
    entries.push([id, {
      checked: stringIds(progress.checked),
      completed: stringIds(progress.completed),
      servings: positiveInteger(progress.servings, 2),
      stepIndex: typeof progress.stepIndex === 'number' && Number.isSafeInteger(progress.stepIndex)
        && progress.stepIndex >= 0 ? progress.stepIndex : 0,
      ...(timer ? { timer: {
        stepId: timer.stepId as string,
        endAt,
        remaining: nonNegativeNumber(timer.remaining),
        running: timer.running === true && endAt !== null,
      } } : {}),
    }]);
  }
  return Object.fromEntries(entries);
}

function restoreState(value: unknown): StoredState {
  const initial = createInitialState();
  if (!isRecord(value)) return initial;
  const preferences = isRecord(value.preferences) ? value.preferences : {};
  return {
    profile: parseProfile(value.profile, initial.profile),
    saved: stringIds(value.saved),
    liked: stringIds(value.liked),
    likedComments: stringIds(value.likedComments),
    following: stringIds(value.following),
    comments: Array.isArray(value.comments)
      ? value.comments.map(parseComment).filter((comment): comment is RecipeComment => comment !== null) : [],
    posts: Array.isArray(value.posts)
      ? value.posts.map(parsePost).filter((post): post is SocialRecipe => post !== null) : [],
    preferences: {
      autoplay: typeof preferences.autoplay === 'boolean' ? preferences.autoplay : initial.preferences.autoplay,
      reducedMotion: typeof preferences.reducedMotion === 'boolean' ? preferences.reducedMotion : initial.preferences.reducedMotion,
      haptics: typeof preferences.haptics === 'boolean' ? preferences.haptics : initial.preferences.haptics,
    },
    cooking: parseCooking(value.cooking),
  };
}

export async function loadState(): Promise<StoredState> {
  await pendingWrite;
  try {
    const serialized = await AsyncStorage.getItem(STORAGE_KEY);
    return serialized === null ? createInitialState() : restoreState(JSON.parse(serialized));
  } catch {
    // An unavailable store or a damaged old record must not prevent the app from opening.
    return createInitialState();
  }
}

export async function saveState(state: StoredState): Promise<void> {
  // Snapshot before queueing so subsequent state mutations cannot change this write.
  const serialized = JSON.stringify(state);
  const operation = pendingWrite.then(() => AsyncStorage.setItem(STORAGE_KEY, serialized));
  // Recover the queue for later saves, while the operation returned to this caller still rejects.
  pendingWrite = operation.then(() => undefined, () => undefined);
  await operation;
}
