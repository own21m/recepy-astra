import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Switch, Text,
  TextInput, View, useWindowDimensions,
} from 'react-native';
import { radius, useTheme, useThemeStyles, type ThemeColors } from '../theme';
import type { Creator, OwnProfile, SocialRecipe } from '../data/recipes';
import type { AppPreferences } from '../storage';
import { parseRecipeText } from '../domain/recipeParser';
import { Icon, IconButton, PuffyButton, EmptyState } from '../components/primitives';
import type { IconName } from '../components/primitives';

type RecipeAction = (recipe: SocialRecipe) => void;
type CreatorAction = (creator: Creator) => void;
const compact = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(1).replace('.', ',').replace(',0', '')} mil` : String(value);
const timeOf = (recipe: SocialRecipe) => parseRecipeText(recipe.rawText).totalMinutes || '—';
const categories: { name: string; icon: IconName }[] = [
  { name: 'Todo', icon: 'sparkles-outline' },
  { name: 'Rápido', icon: 'timer-outline' },
  { name: 'Pasta', icon: 'restaurant-outline' },
  { name: 'Vegetariano', icon: 'leaf-outline' },
  { name: 'Dulce', icon: 'cafe-outline' },
];

export function RecipeGrid({ recipes, onRecipe, onProfile }: {
  recipes: SocialRecipe[];
  onRecipe: RecipeAction;
  onProfile?: CreatorAction;
}) {
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const { width } = useWindowDimensions();
  const [availableWidth, setAvailableWidth] = useState(Math.max(280, Math.min(width - 40, 1080)));
  const columns = availableWidth >= 1050 ? 4 : availableWidth >= 700 ? 3 : 2;
  const cardWidth = (availableWidth - (columns - 1) * 14) / columns;
  return <View style={styles.recipeGrid} onLayout={event => setAvailableWidth(event.nativeEvent.layout.width)}>
    {recipes.map(recipe => <View key={recipe.id} style={[styles.recipeCard, { width: cardWidth }]}>
      <Pressable onPress={() => onRecipe(recipe)} accessibilityRole="button" accessibilityLabel={`Ver receta: ${recipe.title}`} style={({ pressed }) => [styles.cardImageButton, { height: cardWidth * 1.12 }, pressed && styles.pressed]}>
        <Image source={recipe.image} style={styles.cardImage} resizeMode="cover" />
        <View style={styles.cardImageShade} />
        <View style={styles.timeBadge}><Icon name="time-outline" size={11} color="#f7f5f0" /><Text style={styles.timeText}>{timeOf(recipe)} min</Text></View>
        <View style={styles.cardType}><Icon name={recipe.video ? 'play' : 'restaurant-outline'} size={13} color="#f7f5f0" /></View>
      </Pressable>
      <Pressable onPress={() => onRecipe(recipe)} accessibilityRole="button" accessibilityLabel={recipe.title} style={({ pressed }) => [styles.cardTitleButton, pressed && styles.pressed]}><Text numberOfLines={2} style={styles.cardTitle}>{recipe.title}</Text></Pressable>
      <View style={styles.cardFooter}>
        {onProfile ? <Pressable onPress={() => onProfile(recipe.author)} accessibilityRole="button" accessibilityLabel={`Perfil de ${recipe.author.name}`} style={styles.cardAuthor}><Image source={{ uri: recipe.author.avatar }} style={styles.smallAvatar} /><Text numberOfLines={1} style={styles.cardAuthorText}>{recipe.author.name.split(' ')[0]}</Text></Pressable> : <Text style={styles.cardTag} numberOfLines={1}>{recipe.tags[0]}</Text>}
        <View style={styles.cardLikes}><Icon name="heart-outline" size={11} color={colors.muted} /><Text style={styles.cardLikeText}>{compact(recipe.likes)}</Text></View>
      </View>
    </View>)}
  </View>;
}

export function ExploreScreen({ recipes, onRecipe, onProfile, initialQuery = '' }: {
  recipes: SocialRecipe[];
  onRecipe: RecipeAction;
  onProfile: CreatorAction;
  initialQuery?: string;
}) {
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState('Todo');
  const filtered = useMemo(() => recipes.filter(recipe => {
    const haystack = `${recipe.title} ${recipe.description} ${recipe.author.name} ${recipe.author.handle} ${recipe.tags.join(' ')} ${recipe.rawText}`.toLocaleLowerCase('es');
    const matchesQuery = haystack.includes(query.trim().toLocaleLowerCase('es'));
    const tags = recipe.tags.map(tag => tag.toLocaleLowerCase('es'));
    return matchesQuery && (category === 'Todo' || (category === 'Rápido' ? Number(timeOf(recipe)) <= 30 : tags.some(tag => tag.includes(category.toLocaleLowerCase('es')))));
  }), [recipes, query, category]);
  return <ScrollView style={styles.screen} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
    <Text accessibilityRole="header" style={styles.heading}>Explorar</Text>
    <View style={styles.searchBox}><Icon name="search-outline" size={19} color={colors.muted} /><TextInput accessibilityLabel="Buscar recetas, ingredientes o creadores" placeholder="¿Qué se te antoja?" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} style={styles.searchInput} returnKeyType="search" autoCorrect={false} />{query.length > 0 && <IconButton name="close" label="Limpiar búsqueda" size={30} onPress={() => setQuery('')} />}</View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow} keyboardShouldPersistTaps="handled">{categories.map(item => <Pressable key={item.name} accessibilityRole="button" accessibilityState={{ selected: category === item.name }} onPress={() => setCategory(item.name)} style={[styles.categoryChip, category === item.name && styles.activeCategory]}><Icon name={item.icon} size={13} color={category === item.name ? colors.onPrimary : colors.muted} /><Text style={[styles.categoryText, category === item.name && styles.activeCategoryText]}>{item.name}</Text></Pressable>)}</ScrollView>
    <View style={styles.sectionHead}><Text accessibilityRole="header" style={styles.sectionTitle}>{query.trim() ? 'Resultados' : 'Recetas'}</Text><Text style={styles.resultCount}>{filtered.length} {filtered.length === 1 ? 'receta' : 'recetas'}</Text></View>
    {filtered.length ? <RecipeGrid recipes={filtered} onRecipe={onRecipe} onProfile={onProfile} /> : <EmptyState icon="search-outline" title="Sin resultados" body="Prueba otro ingrediente o categoría." action="Ver recetas" onAction={() => { setQuery(''); setCategory('Todo'); }} />}
  </ScrollView>;
}

function ProfileAvatar({ uri, name }: { uri: string; name: string }) {
  const styles = useThemeStyles(createStyles);
  const [loaded, setLoaded] = useState(false);
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase('es') || 'R';
  return <View style={styles.profileAvatarFrame} accessible accessibilityRole="image" accessibilityLabel={`Foto de ${name}`}>
    <Text style={styles.profileInitials}>{initials}</Text>
    <Image source={{ uri }} style={[styles.profileAvatar, { opacity: loaded ? 1 : 0 }]} onLoad={() => setLoaded(true)} onError={() => setLoaded(false)} accessibilityElementsHidden importantForAccessibility="no" />
  </View>;
}

export function ProfileScreen({ profile, recipes, isOwn, following, followingCount, onFollow, onEdit, onSettings, onCreate, onRecipe }: {
  profile: OwnProfile | Creator;
  recipes: SocialRecipe[];
  isOwn: boolean;
  following: boolean;
  followingCount: number;
  onFollow: () => void;
  onEdit: () => void;
  onSettings: () => void;
  onCreate: () => void;
  onRecipe: RecipeAction;
}) {
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const visibleRecipes = isOwn ? recipes : recipes.filter(recipe => recipe.author.handle === profile.handle);
  return <ScrollView style={styles.screen} contentContainerStyle={[styles.page, styles.profilePage]} keyboardShouldPersistTaps="handled">
    {isOwn && <View style={styles.profileSettings}><IconButton name="settings-outline" label="Abrir configuración" onPress={onSettings} /></View>}
    <View style={styles.profileHero}>
      <ProfileAvatar key={profile.avatar} uri={profile.avatar} name={profile.name} />
      <Text accessibilityRole="header" style={styles.profileName}>{profile.name}</Text>
      <Text style={styles.profileHandle}>{profile.handle}</Text>
    </View>
    {Boolean(profile.bio) && <Text style={styles.profileBio}>{profile.bio}</Text>}
    <View style={styles.profileStats}>
      <View style={styles.statCol}><Text style={styles.statNumber}>{visibleRecipes.length}</Text><Text style={styles.statLabel}>publicaciones</Text></View>
      <View style={styles.statDivider} />
      <View style={styles.statCol}><Text style={styles.statNumber}>{isOwn ? followingCount : 'followers' in profile ? profile.followers : '—'}</Text><Text style={styles.statLabel}>{isOwn ? 'siguiendo' : 'seguidores'}</Text></View>
    </View>
    <View style={styles.profileActions}>{isOwn ? <>
      <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel="Editar mi perfil" style={({ pressed }) => [styles.outlineButton, styles.flexButton, pressed && styles.pressed]}><Icon name="create-outline" size={17} color={colors.text} /><Text style={styles.outlineButtonText}>Editar perfil</Text></Pressable>
      <PuffyButton title="Crear receta" icon="add" small onPress={onCreate} style={styles.flexButton} />
    </> : <PuffyButton title={following ? 'Siguiendo' : 'Seguir'} icon={following ? 'checkmark' : 'add'} onPress={onFollow} style={styles.followButton} />}</View>
    <View style={styles.profilePosts}><Text accessibilityRole="header" style={styles.profilePostsTitle}>Publicaciones</Text>
      {visibleRecipes.length ? <RecipeGrid recipes={visibleRecipes} onRecipe={onRecipe} /> : <View style={styles.profileEmpty}><Text style={styles.profileEmptyText}>Aún no hay recetas</Text></View>}
    </View>
  </ScrollView>;
}

function PreferenceRow({ icon, title, body, value, onChange }: { icon: IconName; title: string; body: string; value: boolean; onChange: (value: boolean) => void }) {
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  return <View style={styles.settingRow}><View style={styles.settingIcon}><Icon name={icon} size={19} color={colors.muted} /></View><View style={styles.settingCopy}><Text style={styles.settingTitle}>{title}</Text><Text style={styles.settingBody}>{body}</Text></View><Switch accessibilityLabel={title} value={value} onValueChange={onChange} trackColor={{ false: colors.border, true: colors.red }} thumbColor={colors.onPrimary} ios_backgroundColor={colors.border} /></View>;
}

export function SettingsScreen({ preferences, onChange }: { preferences: AppPreferences; onChange: (patch: Partial<AppPreferences>) => void }) {
  const { colors, isDark } = useTheme();
  const styles = useThemeStyles(createStyles);
  return <ScrollView style={styles.screen} contentContainerStyle={styles.settingsPage} keyboardShouldPersistTaps="handled">
    <Text accessibilityRole="header" style={styles.heading}>Configuración</Text>
    <View style={styles.settingsGroup}>
      <PreferenceRow icon="play-outline" title="Reproducción automática" body="Reproducir al llegar al video." value={preferences.autoplay} onChange={autoplay => onChange({ autoplay })} />
      <View style={styles.settingLine} />
      <PreferenceRow icon="sparkles-outline" title="Reducir movimiento" body="Menos animaciones." value={preferences.reducedMotion} onChange={reducedMotion => onChange({ reducedMotion })} />
      <View style={styles.settingLine} />
      <PreferenceRow icon="hand-left-outline" title="Respuesta háptica" body="Vibración al tocar los controles." value={preferences.haptics} onChange={haptics => onChange({ haptics })} />
      <View style={styles.settingLine} />
      <View style={styles.settingRow} accessibilityLabel={`Apariencia automática, ${isDark ? 'oscuro' : 'claro beige'}, según el sistema`}><View style={styles.settingIcon}><Icon name={isDark ? 'moon-outline' : 'sunny-outline'} size={19} color={colors.red} /></View><View style={styles.settingCopy}><Text style={styles.settingTitle}>Apariencia</Text><Text style={styles.settingBody}>Automática · {isDark ? 'oscuro' : 'claro beige'}</Text><Text style={styles.appearanceHint}>Se adapta al sistema.</Text></View></View>
    </View>
    <Text style={styles.localPrivacy}>Tus recetas, perfil y preferencias se guardan en este dispositivo.</Text>
  </ScrollView>;
}

export function EditProfileScreen({ profile, onSave, onPickAvatar }: { profile: OwnProfile; onSave: (profile: OwnProfile) => void; onPickAvatar: () => Promise<string | null> }) {
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const [name, setName] = useState(profile.name);
  const [handle, setHandle] = useState(profile.handle);
  const [bio, setBio] = useState(profile.bio);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');
  const normalizedHandle = handle.trim().replace(/^@/, '');
  const valid = name.trim().length > 0 && /^[a-zA-Z0-9._]{2,30}$/.test(normalizedHandle);
  async function pickAvatar() { setPicking(true); setError(''); try { const next = await onPickAvatar(); if (next) setAvatar(next); } catch { setError('No pudimos abrir la foto. Inténtalo de nuevo.'); } finally { setPicking(false); } }
  function save() { if (!valid) return; onSave({ ...profile, name: name.trim(), handle: `@${normalizedHandle}`, bio: bio.trim(), avatar }); }
  return <ScrollView style={styles.screen} contentContainerStyle={styles.editPage} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"><Text accessibilityRole="header" style={styles.editHeading}>Editar perfil</Text><Pressable accessibilityRole="button" accessibilityLabel="Cambiar foto de perfil" disabled={picking} onPress={pickAvatar} style={styles.editAvatarButton}><Image source={{ uri: avatar }} style={styles.editAvatar} /><View style={styles.changeAvatarBadge}>{picking ? <ActivityIndicator color={colors.text} size="small" /> : <Icon name="camera" size={17} color={colors.text} />}</View></Pressable><Pressable accessibilityRole="button" onPress={pickAvatar} disabled={picking} style={styles.changePhotoTextButton}><Text style={styles.changePhotoText}>{picking ? 'Abriendo tus fotos…' : 'Cambiar foto'}</Text></Pressable><View style={styles.field}><Text style={styles.fieldLabel}>Tu nombre</Text><TextInput accessibilityLabel="Tu nombre" value={name} onChangeText={setName} maxLength={40} placeholder="¿Cómo te llamas?" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="words" returnKeyType="next" /></View><View style={styles.field}><Text style={styles.fieldLabel}>Tu usuario</Text><TextInput accessibilityLabel="Tu usuario" value={handle} onChangeText={text => setHandle(text.replace(/\s/g, ''))} maxLength={31} placeholder="@tu.cocina" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="none" autoCorrect={false} returnKeyType="next" /><Text style={styles.fieldHint}>De 2 a 30 letras, números, puntos o guiones bajos.</Text></View><View style={styles.field}><View style={styles.bioLabelRow}><Text style={styles.fieldLabel}>Tu toque personal</Text><Text style={styles.bioCount}>{bio.length}/180</Text></View><TextInput accessibilityLabel="Tu presentación" value={bio} onChangeText={setBio} maxLength={180} multiline placeholder="¿Qué se cocina por aquí?" placeholderTextColor={colors.muted} style={[styles.input, styles.bioInput]} textAlignVertical="top" /></View>{error.length > 0 && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}<PuffyButton title="Guardar cambios" icon="checkmark" onPress={save} disabled={!valid || picking} /><Text style={styles.saveHint}>Guardado en este dispositivo.</Text></ScrollView>;
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  page: { paddingHorizontal: 20, paddingTop: 25, paddingBottom: 115, width: '100%', maxWidth: 1120, alignSelf: 'center' },
  heading: { color: colors.text, fontSize: 28, fontWeight: '600', lineHeight: 34, letterSpacing: -0.8, marginBottom: 24 },
  pressed: { opacity: 0.7 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 15, minHeight: 54 },
  searchInput: { flex: 1, color: colors.text, fontSize: 13, minHeight: 48, paddingVertical: 10 },
  categoryRow: { gap: 8, paddingTop: 20, paddingBottom: 25 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderColor: colors.border, borderWidth: 1, borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: 13, backgroundColor: colors.surface },
  activeCategory: { backgroundColor: colors.red, borderColor: colors.red },
  categoryText: { color: colors.muted, fontSize: 11 },
  activeCategoryText: { color: colors.onPrimary, fontWeight: '600' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 19, gap: 12 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '600', letterSpacing: -0.3 },
  resultCount: { color: colors.muted, fontSize: 10 },
  recipeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start', width: '100%' },
  recipeCard: { marginBottom: 13 },
  cardImageButton: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface, width: '100%' },
  cardImage: { width: '100%', height: '100%' },
  cardImageShade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.08)' },
  timeBadge: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: 'rgba(10,10,10,0.52)', borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 8 },
  timeText: { color: '#f7f5f0', fontSize: 9, fontWeight: '500' },
  cardType: { position: 'absolute', bottom: 10, right: 10, width: 27, height: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,10,10,0.42)', borderColor: 'rgba(255,255,255,0.19)', borderWidth: 1, borderRadius: radius.pill },
  cardTitleButton: { paddingTop: 12, paddingBottom: 9 },
  cardTitle: { color: colors.text, fontSize: 13, fontWeight: '600', lineHeight: 17, letterSpacing: -0.2 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  cardAuthor: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  smallAvatar: { width: 18, height: 18, borderRadius: radius.pill },
  cardAuthorText: { color: colors.muted, fontSize: 9, flexShrink: 1 },
  cardTag: { color: colors.muted, fontSize: 9, flexShrink: 1 },
  cardLikes: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  cardLikeText: { color: colors.muted, fontSize: 9 },
  profilePage: { maxWidth: 760, alignItems: 'center', paddingTop: 36, position: 'relative' },
  profileSettings: { position: 'absolute', top: 12, right: 20 },
  profileHero: { alignItems: 'center', width: '100%', paddingHorizontal: 46 },
  profileAvatarFrame: { width: 90, height: 90, borderRadius: radius.pill, backgroundColor: colors.surface, marginBottom: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  profileAvatar: { position: 'absolute', top: 0, left: 0, width: 90, height: 90, borderRadius: radius.pill, backgroundColor: 'transparent' },
  profileInitials: { color: colors.text, fontSize: 28, fontWeight: '500', letterSpacing: -1 },
  profileEmpty: { paddingVertical: 42, alignItems: 'center' },
  profileEmptyText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  profileName: { color: colors.text, fontSize: 27, fontWeight: '600', letterSpacing: -0.8, lineHeight: 33, textAlign: 'center' },
  profileHandle: { color: colors.muted, fontSize: 12, marginTop: 7, textAlign: 'center' },
  profileBio: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 17, maxWidth: 340, textAlign: 'center' },
  profileStats: { flexDirection: 'row', gap: 28, alignItems: 'center', justifyContent: 'center', marginTop: 23, marginBottom: 23 },
  statCol: { alignItems: 'center', minWidth: 78 },
  statNumber: { color: colors.text, fontSize: 18, fontWeight: '600', letterSpacing: -0.4, textAlign: 'center' },
  statLabel: { color: colors.muted, fontSize: 10, marginTop: 5 },
  statDivider: { backgroundColor: colors.border, width: 1, height: 30 },
  profileActions: { flexDirection: 'row', gap: 10, marginBottom: 32, alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: 330 },
  profilePosts: { width: '100%' },
  profilePostsTitle: { textAlign: 'center', color: colors.muted, fontSize: 12, fontWeight: '500', paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 22 },
  flexButton: { flex: 1 },
  followButton: { minWidth: 180 },
  outlineButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius:radius.pill, paddingHorizontal: 15, backgroundColor: colors.surface },
  outlineButtonText: { color: colors.text, fontSize: 12, fontWeight: '500' },
  settingsPage: { padding: 24, paddingBottom: 110, width: '100%', maxWidth: 760, alignSelf: 'center' },
  localPrivacy: { color: colors.muted, fontSize: 11, lineHeight: 18, textAlign: 'center', marginTop: 25, paddingHorizontal: 15 },
  settingsGroup: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 18, minHeight: 81 },
  settingIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: colors.raised, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  settingCopy: { flex: 1, gap: 6 },
  settingTitle: { color: colors.text, fontSize: 13, fontWeight: '500', lineHeight: 18 },
  settingBody: { color: colors.muted, fontSize: 10, lineHeight: 16 },
  appearanceHint: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  settingLine: { height: 1, marginLeft: 63, marginRight: 16, backgroundColor: colors.border },
  editPage: { paddingHorizontal: 24, paddingTop: 26, paddingBottom: 70, maxWidth: 600, width: '100%', alignSelf: 'center' },
  editHeading: { color: colors.text, fontSize: 28, fontWeight: '600', letterSpacing: -0.8, textAlign: 'center' },
  editAvatarButton: { width: 100, height: 100, marginTop: 30, alignSelf: 'center', position: 'relative' },
  editAvatar: { width: 100, height: 100, borderRadius: radius.pill, borderWidth: 4, borderColor: colors.surface, backgroundColor: colors.surface },
  changeAvatarBadge: { position: 'absolute', bottom: 0, right: 0, borderRadius: radius.pill, backgroundColor: colors.raised, borderColor: colors.background, borderWidth: 3, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  changePhotoTextButton: { alignSelf: 'center', paddingTop: 13, paddingBottom: 27 },
  changePhotoText: { color: colors.text, fontSize: 12, fontWeight: '500' },
  field: { marginBottom: 22, gap: 10 },
  fieldLabel: { color: colors.text, fontSize: 11, fontWeight: '500' },
  input: { minHeight: 51, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 15, paddingVertical: 14, color: colors.text, fontSize: 15 },
  bioInput: { minHeight: 116, lineHeight: 22 },
  fieldHint: { fontSize: 9, color: colors.muted, lineHeight: 15 },
  bioLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bioCount: { fontSize: 9, color: colors.muted },
  errorText: { color: colors.red, fontSize: 11, lineHeight: 18, marginBottom: 18 },
  saveHint: { color: colors.muted, fontSize: 9, textAlign: 'center', marginTop: 16 },
});
