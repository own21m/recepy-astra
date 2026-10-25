import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import { darkColors, useTheme, useThemeStyles, type ThemeColors } from '../theme';
import { Glass, Icon, feedback, type IconName } from './primitives';
import { menuTargetAt, menuTargetsInBar, resolveMenuRelease, type MenuPoint, type MenuRect } from '../domain/menuGesture';

export type Route = 'feed' | 'explore' | 'create' | 'saved' | 'profile';
export type FloatingMenuProps = {
  route: Route;
  expanded: boolean;
  hidden: boolean;
  bottom: number;
  reducedMotion: boolean;
  onToggle: () => void;
  onNavigate: (route: Route) => void;
  onGestureOpen: () => void;
  onGestureClose: () => void;
};
type Measurable = { measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void };
const destinations: { id: Route; label: string; icon: IconName; activeIcon: IconName }[] = [
  { id: 'feed', label: 'Inicio', icon: 'home-outline', activeIcon: 'home' },
  { id: 'explore', label: 'Explorar', icon: 'compass-outline', activeIcon: 'compass' },
  { id: 'create', label: 'Crear', icon: 'add', activeIcon: 'add' },
  { id: 'saved', label: 'Recetario', icon: 'bookmark-outline', activeIcon: 'bookmark' },
  { id: 'profile', label: 'Perfil', icon: 'person-outline', activeIcon: 'person' },
];
const HOLD_DELAY = 220;
const IDLE_DELAY = 5000;
const MOVE_THRESHOLD = 12;

function pointOf(event: { nativeEvent: { pageX: number; pageY: number } }): MenuPoint | null {
  const { pageX: x, pageY: y } = event.nativeEvent;
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

export function FloatingMenu(props: FloatingMenuProps) {
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const { width } = useWindowDimensions();
  const compact = width < 700;
  const collapsedWidth = compact ? 104 : 116;
  const collapsedHeight = compact ? 42 : 48;
  const expandedWidth = Math.min(width - 32, 470);
  const expandedHeight = compact ? 66 : 72;
  const [hovered, setHovered] = useState<Route | null>(null);
  const [gestureActive, setGestureActive] = useState(false);
  const visibility = useRef(new Animated.Value(0)).current;
  const expansion = useRef(new Animated.Value(props.expanded ? 1 : 0)).current;
  const latest = useRef(props);
  latest.current = props;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const releaseReset = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holding = useRef(false);
  const touching = useRef(false);
  const wasLongPress = useRef(false);
  const captured = useRef(false);
  const moved = useRef(false);
  const startPoint = useRef<MenuPoint | null>(null);
  const lastPoint = useRef<MenuPoint | null>(null);
  const hoveredRef = useRef<Route | null>(null);
  const navNode = useRef<Measurable | null>(null);
  const navBounds = useRef<Omit<MenuRect, 'id'> | null>(null);
  const barSize = useRef({ width: expandedWidth, height: expandedHeight });
  barSize.current = { width: expandedWidth, height: expandedHeight };
  const targetNodes = useRef<Partial<Record<Route, Measurable | null>>>({});
  const targetBounds = useRef<Partial<Record<Route, MenuRect<Route>>>>({});
  const measureFrame = useRef<number | null>(null);
  const darkMaterial = props.route === 'feed';
  const foreground = darkMaterial ? '#f7f5f0' : colors.text;
  const muted = darkMaterial ? '#b5b5b0' : colors.muted;
  const accent = darkMaterial ? darkColors.red : colors.red;

  function clearHoldTimer() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }
  function clearIdleTimer() {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = null;
  }
  function scheduleIdle() {
    clearIdleTimer();
    if (!latest.current.expanded || latest.current.hidden || holding.current || touching.current) return;
    idleTimer.current = setTimeout(() => {
      idleTimer.current = null;
      if (latest.current.expanded && !holding.current && !touching.current) latest.current.onGestureClose();
    }, IDLE_DELAY);
  }
  function rects() {
    // The outer container already has the final bar height and is stable while
    // the glass surface grows. Use its final hit areas during the hold so a
    // quick release never misses an item just because its animation is midway.
    const outer = navBounds.current;
    if (holding.current && outer) {
      const finalBar = { x: outer.x + (outer.width - barSize.current.width) / 2, y: outer.y, ...barSize.current };
      return menuTargetsInBar(finalBar, destinations.map(item => item.id));
    }
    return Object.values(targetBounds.current).filter((rect): rect is MenuRect<Route> => Boolean(rect));
  }
  function rememberPoint(point: MenuPoint | null) {
    if (!point) return;
    lastPoint.current = point;
    if (holding.current && startPoint.current && Math.hypot(point.x - startPoint.current.x, point.y - startPoint.current.y) > MOVE_THRESHOLD) moved.current = true;
  }
  function selectAt(point: MenuPoint | null) {
    if (!holding.current || !point) return;
    rememberPoint(point);
    // The bar grows under the original finger; growing into an item must not
    // itself choose that item before the user has actually slid their finger.
    const next = moved.current ? menuTargetAt(point, rects()) : null;
    if (next === hoveredRef.current) return;
    hoveredRef.current = next;
    setHovered(next);
    if (next) feedback();
  }
  function measureTargets() {
    navNode.current?.measureInWindow((x, y, measuredWidth, height) => { navBounds.current = { x, y, width: measuredWidth, height }; });
    destinations.forEach(item => targetNodes.current[item.id]?.measureInWindow((x, y, measuredWidth, height) => {
      targetBounds.current[item.id] = { id: item.id, x, y, width: measuredWidth, height };
      if (holding.current) selectAt(lastPoint.current);
    }));
  }
  function resetGesture() {
    clearHoldTimer();
    holding.current = false;
    captured.current = false;
    moved.current = false;
    hoveredRef.current = null;
    setHovered(null);
    setGestureActive(false);
  }
  function finishGesture(point: MenuPoint | null) {
    if (!holding.current) return;
    rememberPoint(point);
    const releasePoint = point ?? lastPoint.current;
    const result = releasePoint ? resolveMenuRelease(releasePoint, rects(), moved.current) : { kind: 'cancel' as const };
    touching.current = false;
    resetGesture();
    // Ignore only the synthetic press produced by this held gesture.
    if (releaseReset.current) clearTimeout(releaseReset.current);
    releaseReset.current = setTimeout(() => { wasLongPress.current = false; releaseReset.current = null; }, 0);
    if (result.kind === 'navigate') {
      feedback();
      latest.current.onNavigate(result.target);
    } else if (result.kind === 'cancel') latest.current.onGestureClose();
    else scheduleIdle();
  }
  function beginPress(event: GestureResponderEvent) {
    clearHoldTimer();
    clearIdleTimer();
    touching.current = true;
    if (releaseReset.current) clearTimeout(releaseReset.current);
    releaseReset.current = null;
    wasLongPress.current = false;
    captured.current = false;
    moved.current = false;
    startPoint.current = pointOf(event);
    lastPoint.current = startPoint.current;
    measureTargets();
    if (latest.current.hidden || latest.current.expanded || !startPoint.current) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      holding.current = true;
      wasLongPress.current = true;
      setGestureActive(true);
      feedback();
      latest.current.onGestureOpen();
      measureFrame.current = requestAnimationFrame(measureTargets);
    }, HOLD_DELAY);
  }
  function moveShouldCapture(event: GestureResponderEvent): boolean {
    const point = pointOf(event);
    rememberPoint(point);
    if (holding.current) return true;
    if (point && startPoint.current && Math.hypot(point.x - startPoint.current.x, point.y - startPoint.current.y) > 14) clearHoldTimer();
    return false;
  }
  const handlers = useRef({ moveShouldCapture, finishGesture, resetGesture, selectAt, scheduleIdle });
  handlers.current = { moveShouldCapture, finishGesture, resetGesture, selectAt, scheduleIdle };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onStartShouldSetPanResponderCapture: () => false,
    onMoveShouldSetPanResponder: event => handlers.current.moveShouldCapture(event),
    onMoveShouldSetPanResponderCapture: event => handlers.current.moveShouldCapture(event),
    onPanResponderGrant: event => { captured.current = true; handlers.current.selectAt(pointOf(event)); },
    onPanResponderMove: event => handlers.current.selectAt(pointOf(event)),
    onPanResponderRelease: event => handlers.current.finishGesture(pointOf(event)),
    onPanResponderTerminate: () => { const active = holding.current; touching.current = false; handlers.current.resetGesture(); if (active) latest.current.onGestureClose(); else handlers.current.scheduleIdle(); },
    onPanResponderTerminationRequest: () => !holding.current,
    onShouldBlockNativeResponder: () => holding.current,
  })).current;

  useEffect(() => {
    Animated.timing(visibility, { toValue: props.hidden ? 120 : 0, duration: props.reducedMotion ? 0 : 180, useNativeDriver: Platform.OS !== 'web' }).start();
    if (props.hidden) { resetGesture(); clearIdleTimer(); }
  }, [props.hidden, props.reducedMotion]);
  useEffect(() => {
    expansion.stopAnimation();
    Animated.timing(expansion, {
      toValue: props.expanded ? 1 : 0,
      duration: props.reducedMotion ? 0 : props.expanded ? 240 : 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => { if (finished && latest.current.expanded) measureTargets(); });
    if (!props.expanded) {
      targetBounds.current = {};
      if (holding.current) resetGesture();
      clearIdleTimer();
    } else {
      measureFrame.current = requestAnimationFrame(measureTargets);
      scheduleIdle();
    }
  }, [props.expanded, props.reducedMotion, expandedWidth]);
  useEffect(() => () => {
    clearHoldTimer();
    clearIdleTimer();
    if (releaseReset.current) clearTimeout(releaseReset.current);
    if (measureFrame.current !== null) cancelAnimationFrame(measureFrame.current);
  }, []);

  return <Animated.View
    ref={node => { navNode.current = node; }}
    onLayout={measureTargets}
    {...pan.panHandlers}
    accessibilityElementsHidden={props.hidden}
    importantForAccessibility={props.hidden ? 'no-hide-descendants' : 'auto'}
    aria-hidden={props.hidden}
    pointerEvents={props.hidden ? 'none' : 'box-none'}
    onTouchStart={() => { touching.current = true; clearIdleTimer(); }}
    onTouchMove={clearIdleTimer}
    onTouchEnd={event => {
      touching.current = false;
      if (holding.current && !captured.current) finishGesture(pointOf(event));
      else scheduleIdle();
    }}
    onTouchCancel={() => { const active = holding.current; touching.current = false; resetGesture(); if (active) latest.current.onGestureClose(); else scheduleIdle(); }}
    onPointerMove={event => { if (holding.current) selectAt(pointOf(event)); else scheduleIdle(); }}
    onPointerUp={event => { if (holding.current) finishGesture(pointOf(event)); else scheduleIdle(); }}
    style={[styles.floatingNav, { bottom: props.bottom, height: expandedHeight, transform: [{ translateY: visibility }] }]}
  >
    <Animated.View style={[styles.morphShell, {
      width: expansion.interpolate({ inputRange: [0, 1], outputRange: [collapsedWidth, expandedWidth] }),
      height: expansion.interpolate({ inputRange: [0, 1], outputRange: [collapsedHeight, expandedHeight] }),
    }]}>
      <Glass appearance={darkMaterial ? 'dark' : 'auto'} style={styles.surface}>
        <Animated.View
          pointerEvents={props.expanded && !gestureActive ? 'auto' : 'none'}
          accessibilityElementsHidden={!props.expanded}
          importantForAccessibility={props.expanded ? 'auto' : 'no-hide-descendants'}
          aria-hidden={!props.expanded}
          style={[styles.navigationRow, { opacity: expansion.interpolate({ inputRange: [0, .3, 1], outputRange: [0, 0, 1] }) }]}
        >
          {destinations.map(item => {
            const current = props.route === item.id;
            const hover = hovered === item.id;
            return <Pressable
              ref={node => { targetNodes.current[item.id] = node; }}
              key={item.id}
              testID={`menu-destination-${item.id}`}
              onLayout={measureTargets}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: current }}
              onPressIn={() => { clearIdleTimer(); if (!holding.current) wasLongPress.current = false; }}
              onPressOut={scheduleIdle}
              onPress={() => { if (holding.current || wasLongPress.current) return; clearIdleTimer(); feedback(); props.onNavigate(item.id); }}
              style={({ pressed }) => [styles.menuDestination, pressed && { opacity: .55 }]}
            >
              <View style={[styles.destinationIcon, (current || hover) && { backgroundColor: darkMaterial ? darkColors.redTint : colors.redTint }, hover && { borderColor: accent }, { transform: [{ scale: hover ? 1.1 : 1 }] }]}>
                <Icon name={current ? item.activeIcon : item.icon} size={22} color={current || hover ? accent : muted}/>
              </View>
              <Text style={[styles.destinationLabel, { color: current ? accent : hover ? foreground : muted }]}>{item.label}</Text>
            </Pressable>;
          })}
        </Animated.View>
        {/* This responder stays mounted while the same surface grows into the
            bar, so the original finger never needs to lift to select a page. */}
        <Pressable
          testID="navigation-menu-trigger"
          pointerEvents={!props.expanded || gestureActive ? 'auto' : 'none'}
          accessibilityElementsHidden={props.expanded}
          importantForAccessibility={props.expanded ? 'no-hide-descendants' : 'auto'}
          aria-hidden={props.expanded}
          accessibilityRole="button"
          accessibilityLabel="Menú"
          accessibilityHint="Mantén pulsado y desliza para elegir una sección."
          accessibilityState={{ expanded: props.expanded }}
          onPressIn={beginPress}
          onPressOut={() => { if (!holding.current) { clearHoldTimer(); touching.current = false; scheduleIdle(); } }}
          onPress={event => {
            clearHoldTimer();
            if (wasLongPress.current) { if (holding.current) finishGesture(pointOf(event)); return; }
            props.onToggle();
          }}
          style={styles.menuTrigger}
        >
          <Animated.View pointerEvents="none" style={[styles.triggerCopy, { opacity: expansion.interpolate({ inputRange: [0, .4, 1], outputRange: [1, 0, 0] }) }]}>
            <Icon name="menu-outline" size={18} color={foreground}/>
            <Text style={[styles.menuLabel, { color: foreground }]}>Menú</Text>
          </Animated.View>
        </Pressable>
      </Glass>
    </Animated.View>
  </Animated.View>;
}

const createStyles = (_colors: ThemeColors) => StyleSheet.create({
  floatingNav: { position: 'absolute', left: 16, right: 16, zIndex: 50, alignItems: 'center', justifyContent: 'flex-end' },
  morphShell: { borderRadius: 999 },
  surface: { width: '100%', height: '100%', borderRadius: 999 },
  navigationRow: { ...StyleSheet.absoluteFill, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  menuDestination: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 999 },
  destinationIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, borderWidth: 1, borderColor: 'transparent' },
  destinationLabel: { fontSize: 9, fontWeight: '500' },
  menuTrigger: { ...StyleSheet.absoluteFill, borderRadius: 999 },
  triggerCopy: { flex: 1, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 13, fontWeight: '500' },
});
