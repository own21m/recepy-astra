import React, { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator, AppState, FlatList, Image, PanResponder, Platform, Pressable,
  StyleSheet, Text, View, useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { Creator, SocialRecipe } from '../data/recipes';
import { colors, useThemeStyles, type ThemeColors } from '../theme';
import { parseRecipeText } from '../domain/recipeParser';
import { EmptyState, Glass, Icon, IconButton, PuffyButton, feedback } from '../components/primitives';
import type { IconName } from '../components/primitives';

export type FeedScreenProps = {
  recipes: SocialRecipe[];
  liked: string[];
  saved: string[];
  following: string[];
  onLike: (id: string) => void;
  onSave: (id: string) => void;
  onRecipe: (recipe: SocialRecipe) => void;
  onComments: (recipe: SocialRecipe) => void;
  onProfile: (creator: Creator) => void;
  onFollow: (creator: Creator) => void;
  onShare: (recipe: SocialRecipe) => void;
  autoplay: boolean;
  isFocused: boolean;
  ownHandle: string;
  onScrollStart: () => void;
  renderRecipe: (recipe: SocialRecipe) => ReactNode;
};

const compact = (value: number) => value >= 1000
  ? `${(value / 1000).toFixed(1).replace('.', ',').replace(',0', '')} mil` : String(value);

export function FeedScreen(props: FeedScreenProps) {
  const { width } = useWindowDimensions();
  const wide = Platform.OS === 'web' && width >= 1100;
  const layout = useThemeStyles(createLayout);
  const [pageHeight, setPageHeight] = useState(520);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [appIsActive, setAppIsActive] = useState(AppState.currentState !== 'background');
  const listRef = useRef<FlatList<SocialRecipe>>(null);
  const indexRef = useRef(0);
  const details = useMemo(() => new Map(props.recipes.map(recipe => [recipe.id, parseRecipeText(recipe.rawText)])), [props.recipes]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => setAppIsActive(next === 'active'));
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (indexRef.current >= props.recipes.length) {
      indexRef.current = 0;
      setCurrentIndex(0);
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [props.recipes.length]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 65, minimumViewTime: 100 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: { index?: number | null; isViewable: boolean }[] }) => {
    const next = viewableItems.find(item => item.isViewable && item.index !== null)?.index;
    if (next !== undefined && next !== null) {
      indexRef.current = next;
      setCurrentIndex(next);
    }
  }).current;

  function measureStage(event: LayoutChangeEvent) {
    const height = Math.max(1, Math.round(event.nativeEvent.layout.height));
    if (height === pageHeight) return;
    setPageHeight(height);
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: indexRef.current * height, animated: false }));
  }
  function changePage(direction: number) {
    props.onScrollStart();
    const target = Math.max(0, Math.min(props.recipes.length - 1, currentIndex + direction));
    listRef.current?.scrollToOffset({ offset: target * pageHeight, animated: true });
  }

  return <View style={[styles.screen, wide && layout.screen]}>
    <View style={[styles.stage, wide && layout.stage]} onLayout={measureStage}>
      {props.recipes.length === 0 ? <View style={styles.emptyStage}><EmptyState
        icon="restaurant-outline" title="Algo rico está por llegar."
        body="Las recetas aparecerán aquí."
      /></View> : <>
        <FlatList
          ref={listRef} style={styles.pager} data={props.recipes} keyExtractor={recipe => recipe.id}
          renderItem={({ item, index }) => <FeedPage
            recipe={item} height={pageHeight} index={index} total={props.recipes.length} wide={wide}
            minutes={details.get(item.id)?.totalMinutes ?? 0} steps={details.get(item.id)?.steps.length ?? 0}
            active={index === currentIndex && props.isFocused && appIsActive}
            liked={props.liked.includes(item.id)} saved={props.saved.includes(item.id)}
            following={props.following.includes(item.author.handle) || props.following.includes(item.author.id)}
            own={item.author.handle === props.ownHandle} autoplay={props.autoplay}
            onLike={() => props.onLike(item.id)} onSave={() => props.onSave(item.id)}
            onRecipe={() => props.onRecipe(item)} onComments={() => props.onComments(item)}
            onProfile={() => props.onProfile(item.author)} onFollow={() => props.onFollow(item.author)}
            onShare={() => props.onShare(item)}
          />}
          pagingEnabled decelerationRate="fast" snapToInterval={pageHeight} snapToAlignment="start"
          showsVerticalScrollIndicator={false} bounces={false} initialNumToRender={2}
          maxToRenderPerBatch={2} windowSize={3} removeClippedSubviews={false}
          getItemLayout={(_, index) => ({ length: pageHeight, offset: index * pageHeight, index })}
          onViewableItemsChanged={onViewableItemsChanged} viewabilityConfig={viewabilityConfig}
          onScrollBeginDrag={props.onScrollStart} onScroll={props.onScrollStart} scrollEventThrottle={80}
          onMomentumScrollEnd={event => {
            const index = Math.max(0, Math.min(props.recipes.length - 1, Math.round(event.nativeEvent.contentOffset.y / pageHeight)));
            indexRef.current = index;
            setCurrentIndex(index);
          }}
          extraData={`${currentIndex}:${props.isFocused}:${props.autoplay}:${props.liked.join(',')}:${props.saved.join(',')}:${props.following.join(',')}:${props.ownHandle}:${appIsActive}`}
        />
        {width >= 900 && <View style={[styles.desktopPaging, wide && layout.paging]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Publicación anterior" disabled={currentIndex === 0} onPress={() => changePage(-1)} style={[styles.pageArrow, currentIndex === 0 && styles.disabled]}><Icon name="arrow-up" size={18} color={colors.text} /></Pressable>
          <Text style={styles.pageCounter}>{String(currentIndex + 1).padStart(2, '0')}<Text style={styles.counterDivider}> / </Text>{String(props.recipes.length).padStart(2, '0')}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Siguiente publicación" disabled={currentIndex === props.recipes.length - 1} onPress={() => changePage(1)} style={[styles.pageArrow, currentIndex === props.recipes.length - 1 && styles.disabled]}><Icon name="arrow-down" size={18} color={colors.text} /></Pressable>
        </View>}
      </>}
    </View>
    {wide && props.recipes[currentIndex] && <View style={layout.recipePanel} accessibilityLabel="Receta de la publicación actual">{props.renderRecipe(props.recipes[currentIndex])}</View>}
  </View>;
}

type FeedPageProps = {
  recipe: SocialRecipe; height: number; index: number; total: number; minutes: number; steps: number; wide: boolean;
  active: boolean; liked: boolean; saved: boolean; following: boolean; own: boolean; autoplay: boolean;
  onLike: () => void; onSave: () => void; onRecipe: () => void; onComments: () => void;
  onProfile: () => void; onFollow: () => void; onShare: () => void;
};

function FeedPage(props: FeedPageProps) {
  const { recipe, height } = props;
  const insets = useSafeAreaInsets();
  const openRecipeRef = useRef(props.onRecipe);
  openRecipeRef.current = props.onRecipe;
  const wideRef = useRef(props.wide);
  wideRef.current = props.wide;
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => !wideRef.current && gesture.dx < -20 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.6,
    onMoveShouldSetPanResponderCapture: (_, gesture) => !wideRef.current && gesture.dx < -25 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.8,
    onPanResponderRelease: (_, gesture) => { if (!wideRef.current && gesture.dx < -60 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5) { feedback(); openRecipeRef.current(); } },
    onPanResponderTerminationRequest: () => true,
  })).current;
  const compactCard = height < 500;
  return <View style={[styles.page, { height }]}>
    <View style={styles.card} {...pan.panHandlers}>
      <Image source={recipe.image} resizeMode="cover" style={styles.coverPhoto} accessibilityLabel={recipe.title} />
      {recipe.video !== undefined && <CookingVideo source={recipe.video} active={props.active} autoplay={props.autoplay} wide={props.wide} />}
      <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,.22)', 'transparent', 'rgba(0,0,0,.24)', 'rgba(0,0,0,.91)']} locations={[0, .25, .4, 1]} style={StyleSheet.absoluteFill} />
      <View pointerEvents="box-none" style={[styles.mediaTopline, { top: props.wide ? 22 : insets.top + 74 }]}>
        <Glass appearance="dark" style={styles.postBadge}><Icon name={recipe.video ? 'videocam-outline' : 'camera-outline'} size={12} color="#fff4e8" /><Text style={styles.postBadgeText}>{recipe.video ? 'SE ESTÁ COCINANDO' : props.index === 0 ? 'EL ANTOJO DE HOY' : 'DEL FEED A TU MESA'}</Text></Glass>
        {!recipe.video && <Text style={styles.photoNumber}>{String(props.index + 1).padStart(2, '0')}<Text style={styles.photoNumberMuted}> / {String(props.total).padStart(2, '0')}</Text></Text>}
      </View>
      <View style={[styles.actions, compactCard && styles.compactActions, { bottom: props.wide ? 30 : insets.bottom + 89 }]}>
        <PostAction icon={props.liked ? 'heart' : 'heart-outline'} label={props.liked ? 'Quitar me gusta' : 'Me gusta'} caption={compact(recipe.likes + (props.liked ? 1 : 0))} color={props.liked ? '#ff6d58' : colors.text} onPress={props.onLike} />
        <PostAction icon="chatbubble-outline" label="Abrir comentarios" caption={compact(recipe.comments)} onPress={props.onComments} />
        <PostAction icon={props.saved ? 'bookmark' : 'bookmark-outline'} label={props.saved ? 'Quitar del recetario' : 'Guardar en mi recetario'} caption={props.saved ? 'Guardada' : 'Guardar'} color={props.saved ? '#ffbea4' : colors.text} onPress={props.onSave} />
        <PostAction icon="arrow-redo-outline" label="Compartir receta" onPress={props.onShare} />
      </View>
      <View style={[styles.postCopy, compactCard && styles.compactCopy, { bottom: props.wide ? 30 : insets.bottom + 88 }]}>
        <View style={styles.authorRow}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Perfil de ${recipe.author.name}`} onPress={props.onProfile} style={styles.authorButton}>
            <Image source={{ uri: recipe.author.avatar }} style={styles.avatar} />
            <View style={styles.authorText}><Text numberOfLines={1} style={styles.authorName}>{recipe.author.name}</Text><Text numberOfLines={1} style={styles.authorHandle}>{recipe.author.handle}</Text></View>
          </Pressable>
          {!props.own && <Pressable accessibilityRole="button" accessibilityLabel={props.following ? `Dejar de seguir a ${recipe.author.name}` : `Seguir a ${recipe.author.name}`} onPress={props.onFollow} hitSlop={8} style={styles.followButton}><Icon name={props.following ? 'checkmark' : 'add'} size={14} color={colors.text} />{!compactCard && <Text style={styles.followText}>{props.following ? 'Siguiendo' : 'Seguir'}</Text>}</Pressable>}
        </View>
        <View style={styles.recipeMeta}><Icon name="time-outline" size={12} color="#e0d8cc" /><Text style={styles.metaText}>{props.minutes || '—'} min</Text><View style={styles.metaDot} /><Text style={styles.metaText}>{props.steps} pasos</Text><View style={styles.metaDot} /><Text style={styles.metaText} numberOfLines={1}>{recipe.tags[0] || 'Hecho en casa'}</Text></View>
        <Text accessibilityRole="header" numberOfLines={3} style={[styles.recipeTitle, compactCard && styles.compactTitle]}>{recipe.title}</Text>
        {!compactCard && <Text numberOfLines={2} style={styles.recipeSubtitle}>{recipe.subtitle}</Text>}
        {!props.wide && <PuffyButton title="Abrir receta" icon="restaurant-outline" arrowDirection="left" hint="Desliza hacia la izquierda para abrir la receta." onPress={props.onRecipe} small={compactCard} material="glass" style={styles.recipeButton} />}
      </View>
    </View>
  </View>;
}

function PostAction({ icon, label, caption, onPress, color = colors.text }: {
  icon: IconName; label: string; caption?: string; onPress: () => void; color?: string;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => { feedback(); onPress(); }} hitSlop={7} style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}>
    <Glass appearance="dark" style={styles.actionGlass}><Icon name={icon} size={22} color={color} /></Glass>
    {caption && <Text numberOfLines={1} style={styles.actionCaption}>{caption}</Text>}
  </Pressable>;
}

function CookingVideo({ source, active, autoplay, wide }: { source: number; active: boolean; autoplay: boolean; wide: boolean }) {
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(source, instance => { instance.loop = true; instance.muted = true; });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(!autoplay);
  const [firstFrame, setFirstFrame] = useState(false);
  const [playFailed, setPlayFailed] = useState(false);

  useEffect(() => { setPaused(!autoplay); }, [autoplay, active]);
  useEffect(() => { player.muted = muted; }, [player, muted]);
  useEffect(() => {
    try {
      if (active && !paused) player.play();
      else player.pause();
    } catch { setPlayFailed(true); }
  }, [player, active, paused]);
  const failed = status === 'error' || playFailed;
  return <>
    {!failed && <VideoView player={player} contentFit="cover" nativeControls={false}
      playsInline surfaceType="textureView" allowsVideoFrameAnalysis={false}
      onFirstFrameRender={() => setFirstFrame(true)}
      style={[StyleSheet.absoluteFill, { opacity: firstFrame ? 1 : 0 }]} />}
    {failed ? <View style={[styles.videoError, { top: wide ? 65 : insets.top + 120 }]}><Icon name="information-circle-outline" size={15} color="#f0d2bd" /><Text style={styles.videoErrorText}>El video no cargó. La receta sigue aquí.</Text></View> : <View style={[styles.videoControls, { top: wide ? 22 : insets.top + 74 }]}>
      {status === 'loading' && active && <ActivityIndicator size="small" color={colors.text} style={styles.loadingIndicator} />}
      <IconButton appearance="dark" name={isPlaying ? 'pause' : 'play'} label={isPlaying ? 'Pausar video' : 'Reproducir video'} size={34} onPress={() => setPaused(value => !value)} />
      <IconButton appearance="dark" name={muted ? 'volume-mute-outline' : 'volume-high-outline'} label={muted ? 'Activar sonido' : 'Silenciar video'} size={34} onPress={() => setMuted(value => !value)} />
    </View>}
  </>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: 0, backgroundColor: colors.background, width: '100%' },
  stage: { flex: 1, minHeight: 0, width: '100%' },
  pager: { flex: 1 },
  emptyStage: { flex: 1, justifyContent: 'center' },
  page: { width: '100%' },
  card: { flex: 1, overflow: 'hidden', backgroundColor: colors.background, position: 'relative' },
  coverPhoto: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  mediaTopline: { position: 'absolute', top: 17, left: 17, right: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  postBadge: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 7, paddingHorizontal: 10, borderRadius: 99 },
  postBadgeText: { fontSize: 9, fontWeight: '600', letterSpacing: .8, color: '#fff7ed' },
  photoNumber: { color: '#f7f0e3', fontSize: 11, fontWeight: '600', letterSpacing: .5, textShadowColor: '#0008', textShadowRadius: 8 },
  photoNumberMuted: { color: '#f7f0e39c', fontWeight: '400' },
  actions: { position: 'absolute', right: 12, bottom: 23, alignItems: 'center', gap: 18, width: 45 },
  compactActions: { gap: 12, bottom: 20 },
  actionButton: { alignItems: 'center', gap: 5, minWidth: 45 },
  actionPressed: { opacity: .65, transform: [{ scale: .94 }] },
  actionGlass: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  actionCaption: { color: '#fff5e9', fontSize: 11, fontWeight: '500', textShadowColor: '#0008', textShadowRadius: 7, textShadowOffset: { width: 0, height: 1 } },
  postCopy: { position: 'absolute', left: 19, right: 72, bottom: 22 },
  compactCopy: { left: 17, right: 70, bottom: 20 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 17 },
  authorButton: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 0 },
  avatar: { width: 33, height: 33, borderRadius: 17, borderWidth: 1, borderColor: '#ffffff55', backgroundColor: colors.raised },
  authorText: { flexShrink: 1, gap: 4 },
  authorName: { fontSize: 12, color: colors.text, fontWeight: '600' },
  authorHandle: { fontSize: 11, color: '#e8dfd0d9' },
  followButton: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: '#ffffff13', borderWidth: 1, borderColor: '#ffffff4a', flexShrink: 0 },
  followText: { fontSize: 11, color: colors.text },
  recipeMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  metaText: { fontSize: 11, color: '#e0d8cc', flexShrink: 1 },
  metaDot: { width: 2, height: 2, backgroundColor: '#e0d8ccbb', borderRadius: 2, marginHorizontal: 1 },
  recipeTitle: { fontSize: 31, color: '#fffaf1', fontWeight: '700', letterSpacing: -1.1, lineHeight: 33, textShadowColor: '#0004', textShadowRadius: 12 },
  compactTitle: { fontSize: 26, lineHeight: 28, letterSpacing: -.8 },
  recipeSubtitle: { color: '#e7dece', fontSize: 12, lineHeight: 18, marginTop: 11, marginBottom: 17 },
  recipeButton: { marginTop: 14, alignSelf: 'stretch' },
  videoControls: { position: 'absolute', top: 15, right: 16, flexDirection: 'row', gap: 7, alignItems: 'center', zIndex: 4 },
  loadingIndicator: { marginRight: 4 },
  videoError: { position: 'absolute', top: 61, left: 18, right: 18, flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#1e1714d9', borderRadius: 10, borderWidth: 1, borderColor: '#ffffff20', padding: 10, zIndex: 4 },
  videoErrorText: { color: '#f0d2bd', fontSize: 11, flex: 1, lineHeight: 16 },
  desktopPaging: { position: 'absolute', right: 32, top: '35%', alignItems: 'center', gap: 11 },
  pageArrow: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#ffffff32', backgroundColor: '#17171780', alignItems: 'center', justifyContent: 'center' },
  pageCounter: { fontSize: 11, color: '#f3e9d9', textShadowColor: '#0006', textShadowRadius: 5 },
  counterDivider: { color: '#e5d6c296' },
  disabled: { opacity: .28 },
});

const createLayout = (theme: ThemeColors) => StyleSheet.create({
  screen: { flexDirection: 'row', gap: 24, paddingHorizontal: 32, paddingTop: 14, paddingBottom: 96, backgroundColor: theme.background, maxWidth: 1320, alignSelf: 'center' },
  stage: { width: '45%', flex: undefined, borderRadius: 30, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  recipePanel: { flex: 1, minWidth: 0, borderRadius: 30, borderWidth: 1, borderColor: theme.border, overflow: 'hidden', backgroundColor: theme.background },
  paging: { top: 90, right: 16 },
});
