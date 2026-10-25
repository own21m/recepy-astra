import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Keyboard, PanResponder, Platform, Pressable, StyleSheet, View, useWindowDimensions, type KeyboardEvent, type KeyboardMetrics } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemeStyles, type ThemeColors } from '../theme';
import { shouldCapturePanel, shouldDismissPanel, type PanelMotion } from '../domain/panelGesture';
import { keyboardOverlap } from '../domain/keyboardLayout';

type Props = {
  kind: PanelMotion;
  desktop: boolean;
  reducedMotion: boolean;
  onClose: () => void;
  children: (close: () => void) => ReactNode;
};

export function SheetPanel(props: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const offset = useRef(new Animated.Value(props.kind === 'recipe' ? -width : height)).current;
  const shade = useRef(new Animated.Value(0)).current;
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
    const next = latest.current.kind === 'recipe' ? extent.current.width : extent.current.height;
    Animated.parallel([
      Animated.timing(offset, { toValue: next, duration: latest.current.reducedMotion ? 0 : 240, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(shade, { toValue: 0, duration: latest.current.reducedMotion ? 0 : 200, useNativeDriver: Platform.OS !== 'web' }),
    ]).start(() => latest.current.onClose());
  }
  const actions = useRef({ close });
  actions.current = { close };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => latest.current.kind === 'comments',
    onMoveShouldSetPanResponder: (_, g) => shouldCapturePanel(latest.current.kind, g.dx, g.dy),
    onMoveShouldSetPanResponderCapture: (_, g) => shouldCapturePanel(latest.current.kind, g.dx, g.dy),
    onPanResponderGrant: () => offset.stopAnimation(),
    onPanResponderMove: (_, g) => offset.setValue(Math.max(0, latest.current.kind === 'recipe' ? g.dx : g.dy)),
    onPanResponderRelease: (_, g) => {
      const horizontal = latest.current.kind === 'recipe';
      if (shouldDismissPanel(horizontal ? g.dx : g.dy, horizontal ? g.vx : g.vy)) actions.current.close();
      else Animated.spring(offset, { toValue: 0, damping: 25, stiffness: 260, mass: 1, useNativeDriver: Platform.OS !== 'web' }).start();
    },
    onPanResponderTerminate: () => Animated.spring(offset, { toValue: 0, useNativeDriver: Platform.OS !== 'web' }).start(),
    onPanResponderTerminationRequest: () => false,
  })).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(offset, { toValue: 0, duration: props.reducedMotion ? 0 : 290, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(shade, { toValue: 1, duration: props.reducedMotion ? 0 : 220, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
    return () => { offset.stopAnimation(); shade.stopAnimation(); };
  }, []);

  return <View ref={viewport} collapsable={false} onLayout={measureKeyboard} style={styles.backdrop}>
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: shade }]} />
    <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Cerrar panel" onPress={close} />
    <View pointerEvents="box-none" style={[styles.keyboardViewport, { paddingBottom: keyboardInset }]}>
    <Animated.View {...(kind === 'recipe' ? pan.panHandlers : {})} style={[
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
