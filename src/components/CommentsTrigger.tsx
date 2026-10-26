import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { PanResponder, Platform, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import type { SocialRecipe } from '../data/recipes';
import { shouldCaptureCommentsOpening } from '../domain/commentsOpeningGesture';
import type { SheetOpeningGesture } from './useSheetOpening';
import { feedback } from './primitives';

type Props = {
  recipe: SocialRecipe;
  gesture: SheetOpeningGesture;
  onTouchActive: (active: boolean) => void;
  onPress: () => void;
  label: string;
  style: StyleProp<ViewStyle>;
  pressedStyle: StyleProp<ViewStyle>;
  children: ReactNode;
};

/** Reserve only the comments button for this vertical gesture, preserving feed paging. */
export function CommentsTrigger(props: Props) {
  const latest = useRef(props);
  latest.current = props;
  const dragging = useRef(false);
  const cancelled = useRef(false);
  const travelled = useRef(0);
  const suppressClickUntil = useRef(0);
  const [pressed, setPressed] = useState(false);
  function activate() {
    feedback();
    latest.current.onPress();
  }
  const activateRef = useRef(activate);
  activateRef.current = activate;
  function cancelTouch(distance: number) {
    if (dragging.current) latest.current.gesture.end(distance, true);
    dragging.current = false;
    cancelled.current = true;
    setPressed(false);
    suppressClickUntil.current = Date.now() + 400;
  }
  const cancelRef = useRef(cancelTouch);
  cancelRef.current = cancelTouch;
  const pan = useRef(PanResponder.create({
    // Own the button's touch from the start, including fast drags that leave its bounds.
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onPanResponderGrant: () => {
      dragging.current = false;
      cancelled.current = false;
      travelled.current = 0;
      setPressed(true);
      latest.current.onTouchActive(true);
    },
    onPanResponderStart: (_, g) => { if (g.numberActiveTouches > 1) cancelRef.current(g.dy); },
    onPanResponderMove: (_, g) => {
      if (cancelled.current) return;
      travelled.current = Math.max(travelled.current, Math.hypot(g.dx, g.dy));
      if (g.numberActiveTouches > 1) {
        cancelRef.current(g.dy);
        return;
      }
      if (!dragging.current && shouldCaptureCommentsOpening(g.dx, g.dy)) {
        dragging.current = latest.current.gesture.begin(latest.current.recipe, g.dy);
        setPressed(false);
      } else if (dragging.current) latest.current.gesture.move(g.dy);
    },
    onPanResponderRelease: (_, g) => {
      if (dragging.current) latest.current.gesture.end(g.dy);
      else if (!cancelled.current && Math.max(travelled.current, Math.hypot(g.dx, g.dy)) < 10) activateRef.current();
      // Browser Pressable may emit a synthetic click after pointer release, even after a drag.
      suppressClickUntil.current = Date.now() + 400;
      dragging.current = false;
      cancelled.current = true;
      setPressed(false);
      latest.current.onTouchActive(false);
    },
    onPanResponderTerminate: (_, g) => {
      cancelRef.current(g.dy);
      latest.current.onTouchActive(false);
    },
    onPanResponderTerminationRequest: () => false,
  })).current;

  useEffect(() => () => latest.current.onTouchActive(false), []);
  return <View {...pan.panHandlers} style={Platform.OS === 'web' ? { touchAction: 'none', userSelect: 'none' } as any : undefined}>
    <Pressable accessibilityRole="button" accessibilityLabel={props.label}
      accessibilityHint="Toca o arrastra hacia arriba. Suelta pronto para cancelar."
      onPress={() => { if (Date.now() >= suppressClickUntil.current) activateRef.current(); }}
      hitSlop={7}
      style={[props.style, pressed && props.pressedStyle]}>
      {props.children}
    </Pressable>
  </View>;
}
