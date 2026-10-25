import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Keyboard, PanResponder, Platform, Pressable, StyleSheet, View, useWindowDimensions, type KeyboardEvent, type KeyboardMetrics } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemeStyles, type ThemeColors } from '../theme';
import { clampPanelOffset, shouldCapturePanel, shouldDismissPanel, type PanelMotion } from '../domain/panelGesture';
import { keyboardOverlap } from '../domain/keyboardLayout';

type Props = {
  kind: PanelMotion;
  desktop: boolean;
  reducedMotion: boolean;
  /** Shared with the feed during an interactive entrance; no automatic entry animation. */
  openingOffset?: Animated.Value;
  onClose: () => void;
  children: (close: () => void) => ReactNode;
};

export function SheetPanel(props: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const offset = useRef(props.openingOffset ?? new Animated.Value(props.kind === 'recipe' ? -width : height)).current;
  const currentOffset = useRef(props.openingOffset ? 0 : props.kind === 'recipe' ? -width : height);
  const dragOrigin = useRef(0);
  const shade = offset.interpolate({
    inputRange: props.kind === 'recipe' ? [-Math.max(1, width), 0] : [0, Math.max(1, height)],
    outputRange: props.kind === 'recipe' ? [0, 1] : [1, 0],
    extrapolate: 'clamp',
  });
  const closing = useRef(false);
  const viewport = useRef<React.ComponentRef<typeof View>>(null);
  const keyboardFrame = useRef<KeyboardMetrics | null>(null);
  const keyboardEvent = useRef<KeyboardEvent | null>(null);
  const appliedKeyboardInset = useRef(0);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const measureRequest = useRef(0);
  const latest = useRef(props);
  latest.current = props;
  const extent = useRef({ width, height });
  extent.current = { width, height };
  const kind = props.kind;

  useEffect(() => {
    const listener = offset.addListener(({ value }) => { currentOffset.current = value; });
    return () => offset.removeListener(listener);
  }, [offset]);

  function measureKeyboard() {
    if (Platform.OS !== 'ios') return;
    const request = ++measureRequest.current;
    viewport.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => {
      if (request !== measureRequest.current) return;
      const overlap = keyboardOverlap({ x, y, width: measuredWidth, height: measuredHeight }, keyboardFrame.current);
      if (overlap === appliedKeyboardInset.current) return;
      appliedKeyboardInset.current = overlap;
      // One adjustment at the modal viewport keeps the composer and reply bar
      // together. The old nested KAV measured y relative to the 86% sheet.
      if (keyboardEvent.current && !latest.current.reducedMotion) Keyboard.scheduleLayoutAnimation(keyboardEvent.current);
      setKeyboardInset(overlap);
    });
  }

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    keyboardFrame.current = Keyboard.metrics() ?? null;
    const change = (event: KeyboardEvent) => {
      keyboardFrame.current = event.endCoordinates;
      keyboardEvent.current = event;
      measureKeyboard();
    };
    const hide = (event: KeyboardEvent) => {
      keyboardFrame.current = null;
      keyboardEvent.current = event;
      measureKeyboard();
    };
    const subscriptions = [
      Keyboard.addListener('keyboardWillChangeFrame', change),
      Keyboard.addListener('keyboardWillShow', change),
      Keyboard.addListener('keyboardWillHide', hide),
      Keyboard.addListener('keyboardDidHide', hide),
    ];
    measureKeyboard();
    return () => { measureRequest.current += 1; subscriptions.forEach(subscription => subscription.remove()); };
  }, []);

  useEffect(() => { measureKeyboard(); }, [width, height]);

  function close() {
    if (closing.current) return;
    closing.current = true;
    Keyboard.dismiss();
    offset.stopAnimation();
    const next = latest.current.kind === 'recipe' ? -extent.current.width : extent.current.height;
    Animated.timing(offset, { toValue: next, duration: latest.current.reducedMotion ? 0 : 240, useNativeDriver: Platform.OS !== 'web' })
      .start(({ finished }) => { if (finished) latest.current.onClose(); });
  }
  function restore() {
    if (closing.current) return;
    if (latest.current.reducedMotion) { offset.setValue(0); return; }
    Animated.spring(offset, { toValue: 0, damping: 28, stiffness: 280, mass: 1, useNativeDriver: Platform.OS !== 'web' }).start();
  }
  function dragPosition(dx: number, dy: number) {
    const horizontal = latest.current.kind === 'recipe';
    return clampPanelOffset(latest.current.kind, dragOrigin.current + (horizontal ? dx : dy), horizontal ? extent.current.width : extent.current.height);
  }
  const actions = useRef({ close, restore, dragPosition });
  actions.current = { close, restore, dragPosition };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !closing.current && latest.current.kind === 'comments',
    onMoveShouldSetPanResponder: (_, g) => !closing.current && shouldCapturePanel(latest.current.kind, g.dx, g.dy),
    onMoveShouldSetPanResponderCapture: (_, g) => !closing.current && shouldCapturePanel(latest.current.kind, g.dx, g.dy),
    onPanResponderGrant: () => {
      if (closing.current) return;
      dragOrigin.current = currentOffset.current;
      offset.stopAnimation(value => { dragOrigin.current = value; });
    },
    onPanResponderMove: (_, g) => {
      if (closing.current) return;
      const position = actions.current.dragPosition(g.dx, g.dy);
      offset.setValue(position);
    },
    onPanResponderRelease: (_, g) => {
      const horizontal = latest.current.kind === 'recipe';
      const position = actions.current.dragPosition(g.dx, g.dy);
      if (shouldDismissPanel(horizontal ? -position : position, horizontal ? -g.vx : g.vy)) actions.current.close();
      else actions.current.restore();
    },
    onPanResponderTerminate: () => actions.current.restore(),
    onPanResponderTerminationRequest: () => false,
  })).current;

  useEffect(() => {
    if (!props.openingOffset) Animated.timing(offset, { toValue: 0, duration: props.reducedMotion ? 0 : 290, useNativeDriver: Platform.OS !== 'web' }).start();
    return () => offset.stopAnimation();
  }, []);

  return <View ref={viewport} collapsable={false} onLayout={measureKeyboard} style={styles.backdrop}>
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: shade }]} />
    <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Cerrar panel" onPress={close} />
    <View pointerEvents="box-none" style={[styles.keyboardViewport, { paddingBottom: keyboardInset }]}>
    <Animated.View testID={`${kind}-panel`} {...(kind === 'recipe' ? pan.panHandlers : {})} style={[
      styles.panel,
      props.desktop && styles.desktop,
      kind === 'comments' && styles.comments,
      { paddingTop: props.desktop || kind === 'comments' ? 0 : insets.top, paddingBottom: props.desktop || keyboardInset > 0 ? 0 : Math.max(insets.bottom, 8), transform: [kind === 'recipe' ? { translateX: offset } : { translateY: offset }] },
    ]}>
      {kind === 'comments' && <View {...pan.panHandlers} style={styles.handleArea} accessibilityLabel="Desliza hacia abajo para cerrar los comentarios"><View style={styles.handle} /></View>}
      <View style={styles.content}>
        {props.children(close)}
      </View>
    </Animated.View>
    </View>
  </View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  keyboardViewport: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  panel: { width: '100%', height: '100%', backgroundColor: colors.background, overflow: 'hidden' },
  desktop: { height: '94%', maxHeight: 1050, maxWidth: 780, borderRadius: 30, borderWidth: 1, borderColor: colors.border, marginBottom: '2%' },
  comments: { height: '86%', borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, borderColor: colors.border },
  content: { flex: 1, minHeight: 0 },
  handleArea: { height: 32, justifyContent: 'center', alignItems: 'center', ...(Platform.OS === 'web' ? { cursor: 'grab', touchAction: 'none', userSelect: 'none' } as any : {}) },
  handle: { width: 40, height: 4, borderRadius: 99, backgroundColor: colors.muted, opacity: .55 },
});
