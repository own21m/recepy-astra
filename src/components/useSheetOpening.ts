import { useEffect, useRef, useState } from 'react';
import { Animated, AppState, Platform } from 'react-native';
import type { SocialRecipe } from '../data/recipes';
import { recipeOpeningOffset, shouldCompleteRecipeOpening } from '../domain/recipeOpeningGesture';
import { commentsOpeningOffset, commentsPanelTravel, shouldCompleteCommentsOpening } from '../domain/commentsOpeningGesture';
import { feedback } from './primitives';

export type SheetOpeningGesture = {
  begin: (recipe: SocialRecipe, distance: number) => boolean;
  move: (distance: number) => void;
  end: (distance: number, cancelled?: boolean) => void;
};

type Options = {
  kind: 'recipe' | 'comments';
  desktop: boolean;
  width: number;
  height: number;
  enabled: boolean;
  reducedMotion: boolean;
  onBegin: (recipe: SocialRecipe) => void;
  onCancel: () => void;
};

/** The feed owns the touch until release; the same sheet stays mounted afterwards. */
export function useSheetOpening(options: Options) {
  const offset = useRef(new Animated.Value(options.kind === 'recipe' ? -options.width : commentsPanelTravel(options.height, options.desktop))).current;
  const [active, setActive] = useState(false);
  const session = useRef<{ extent: number; phase: 'dragging' | 'settling'; token: number } | null>(null);
  const generation = useRef(0);
  const latest = useRef(options);
  latest.current = options;

  function position(distance: number, extent: number) {
    return latest.current.kind === 'recipe' ? recipeOpeningOffset(distance, extent) : commentsOpeningOffset(distance, extent);
  }

  function reset() {
    generation.current += 1;
    session.current = null;
    offset.stopAnimation();
    setActive(false);
  }
  function begin(recipe: SocialRecipe, distance: number) {
    if (!latest.current.enabled || session.current) return false;
    offset.stopAnimation();
    const extent = latest.current.kind === 'recipe' ? latest.current.width : commentsPanelTravel(latest.current.height, latest.current.desktop);
    session.current = { extent, phase: 'dragging', token: ++generation.current };
    offset.setValue(position(distance, extent));
    setActive(true);
    latest.current.onBegin(recipe);
    return true;
  }
  function move(distance: number) {
    if (session.current?.phase === 'dragging') offset.setValue(position(distance, session.current.extent));
  }
  function end(distance: number, cancelled = false) {
    const current = session.current;
    if (!current || current.phase !== 'dragging') return;
    current.phase = 'settling';
    const complete = !cancelled && (latest.current.kind === 'recipe'
      ? shouldCompleteRecipeOpening(distance, current.extent) : shouldCompleteCommentsOpening(distance, current.extent));
    offset.setValue(position(distance, current.extent));
    if (complete) feedback();
    Animated.timing(offset, {
      toValue: complete ? 0 : latest.current.kind === 'recipe' ? -current.extent : current.extent,
      duration: latest.current.reducedMotion ? 0 : 200,
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (!finished || generation.current !== current.token) return;
      session.current = null;
      setActive(false);
      if (!complete) latest.current.onCancel();
    });
  }
  function interrupt() {
    if (!session.current) return;
    reset();
    latest.current.onCancel();
  }
  const actions = useRef({ interrupt });
  actions.current = { interrupt };

  useEffect(() => { actions.current.interrupt(); }, [options.width, options.height]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') actions.current.interrupt();
    });
    return () => {
      subscription.remove();
      generation.current += 1;
      offset.stopAnimation();
    };
  }, [offset]);

  return { active, offset, reset, gesture: { begin, move, end } satisfies SheetOpeningGesture };
}
