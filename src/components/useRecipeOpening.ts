import { useEffect, useRef, useState } from 'react';
import { Animated, AppState, Platform } from 'react-native';
import type { SocialRecipe } from '../data/recipes';
import { recipeOpeningOffset, shouldCompleteRecipeOpening } from '../domain/recipeOpeningGesture';
import { feedback } from './primitives';

export type RecipeOpeningGesture = {
  begin: (recipe: SocialRecipe, distance: number) => boolean;
  move: (distance: number) => void;
  end: (distance: number, cancelled?: boolean) => void;
};

type Options = {
  width: number;
  height: number;
  enabled: boolean;
  reducedMotion: boolean;
  onBegin: (recipe: SocialRecipe) => void;
  onCancel: () => void;
};

/** The feed owns the touch until release; the same recipe layer stays mounted afterwards. */
export function useRecipeOpening(options: Options) {
  const offset = useRef(new Animated.Value(-options.width)).current;
  const [active, setActive] = useState(false);
  const session = useRef<{ width: number; phase: 'dragging' | 'settling'; token: number } | null>(null);
  const generation = useRef(0);
  const latest = useRef(options);
  latest.current = options;

  function reset() {
    generation.current += 1;
    session.current = null;
    offset.stopAnimation();
    setActive(false);
  }
  function begin(recipe: SocialRecipe, distance: number) {
    if (!latest.current.enabled || session.current) return false;
    offset.stopAnimation();
    session.current = { width: latest.current.width, phase: 'dragging', token: ++generation.current };
    offset.setValue(recipeOpeningOffset(distance, session.current.width));
    setActive(true);
    latest.current.onBegin(recipe);
    return true;
  }
  function move(distance: number) {
    if (session.current?.phase === 'dragging') offset.setValue(recipeOpeningOffset(distance, session.current.width));
  }
  function end(distance: number, cancelled = false) {
    const current = session.current;
    if (!current || current.phase !== 'dragging') return;
    current.phase = 'settling';
    const complete = !cancelled && shouldCompleteRecipeOpening(distance, current.width);
    offset.setValue(recipeOpeningOffset(distance, current.width));
    if (complete) feedback();
    Animated.timing(offset, {
      toValue: complete ? 0 : -current.width,
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

  return { active, offset, reset, gesture: { begin, move, end } satisfies RecipeOpeningGesture };
}
