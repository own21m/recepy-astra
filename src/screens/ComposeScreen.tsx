import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, AppState, Image, Keyboard, Pressable, ScrollView, StyleSheet, Text,
  TextInput, View, type ImageSourcePropType,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { Icon, IconButton, PuffyButton, useCommonStyles } from '../components/primitives';
import { useTheme, useThemeStyles, type ThemeColors } from '../theme';
import { exampleRecipeText, exampleRecipeTextEnglish, parseRecipeText, scaleIngredient, type ParsedRecipe } from '../domain/recipeParser';
import { reviewRecipeClarity } from '../domain/recipeReview';
import type { OwnProfile, SocialRecipe } from '../data/recipes';

type Props = {
  profile: OwnProfile;
  onPreview: (parsed: ParsedRecipe, image: ImageSourcePropType) => void;
  onPublish: (recipe: SocialRecipe) => void;
  onPickImage: () => Promise<string | null>;
};

type Draft = { source: string; imageUri: string | null; examplePhoto: boolean };
const DRAFT_KEY = 'recepy:composer:v1';
let draftWriteQueue: Promise<void> = Promise.resolve();
const demoImage: ImageSourcePropType = require('../../assets/rigatoni.webp');
const starter = 'Nombre de tu receta\nPorciones: 2\nTiempo: 25 minutos\n\nIngredientes:\n200 g de pasta\n2 tomates maduros\n\nPreparación:\n1. Cuece la pasta durante 10 minutos.\n2. Prepara la salsa y mezcla.';

export function ComposeScreen({ profile, onPreview, onPublish, onPickImage }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useThemeStyles(createStyles);
  const common = useCommonStyles();
  const [source, setSource] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [examplePhoto, setExamplePhoto] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [parsed, setParsed] = useState<ParsedRecipe | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyImage, setBusyImage] = useState(false);
  const [busyPaste, setBusyPaste] = useState(false);
  const [busyPublish, setBusyPublish] = useState(false);
  const [expanded, setExpanded] = useState<'ingredients' | 'steps' | null>(null);
  const [undoText, setUndoText] = useState('');
  const [chooseExample, setChooseExample] = useState(false);
  const [showClarity, setShowClarity] = useState(false);
  const scroll = useRef<{ scrollTo: (options: { y: number; animated: boolean }) => void } | null>(null);
  const mounted = useRef(true);
  const writes = useRef<Promise<void>>(draftWriteQueue);
  const latestDraft = useRef<Draft>({ source: '', imageUri: null, examplePhoto: false });
  const loadedRef = useRef(false);
  const published = useRef(false);
  const lastQueued = useRef<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    mounted.current = true;
    void draftWriteQueue.then(() => AsyncStorage.getItem(DRAFT_KEY)).then(value => {
      if (cancelled || !value) return;
      const draft: Partial<Draft> = JSON.parse(value);
      latestDraft.current = {
        source: typeof draft.source === 'string' ? draft.source : '',
        imageUri: typeof draft.imageUri === 'string' ? draft.imageUri : null,
        examplePhoto: draft.examplePhoto === true,
      };
      if (typeof draft.source === 'string') setSource(draft.source);
      if (typeof draft.imageUri === 'string') setImageUri(draft.imageUri);
      setExamplePhoto(draft.examplePhoto === true);
      if (draft.source) setNotice('Borrador recuperado.');
    }).catch(() => {
      if (!cancelled) setNotice('No pudimos recuperar el borrador anterior. Puedes empezar aquí.');
    }).finally(() => { if (!cancelled) { loadedRef.current = true; setLoaded(true); } });
    return () => { cancelled = true; mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    latestDraft.current = { source, imageUri, examplePhoto };
    if (published.current) return;
    debounce.current = setTimeout(() => { debounce.current = null; persistLatest(); }, 300);
    return () => { if (debounce.current) { clearTimeout(debounce.current); debounce.current = null; } };
  }, [source, imageUri, examplePhoto, loaded]);

  useEffect(() => {
    const flush = () => {
      if (debounce.current) { clearTimeout(debounce.current); debounce.current = null; }
      persistLatest();
    };
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'inactive' || state === 'background') flush();
    });
    return () => { subscription.remove(); flush(); };
  }, []);

  function persistLatest() {
    if (!loadedRef.current || published.current) return;
    const snapshot = { ...latestDraft.current };
    const serialized = JSON.stringify(snapshot);
    if (lastQueued.current === serialized) return;
    lastQueued.current = serialized;
    writes.current = draftWriteQueue.then(async () => {
      if (published.current) return;
      if (!snapshot.source.trim() && !snapshot.imageUri && !snapshot.examplePhoto) await AsyncStorage.removeItem(DRAFT_KEY);
      else await AsyncStorage.setItem(DRAFT_KEY, serialized);
    }).catch(() => {
      lastQueued.current = null;
      if (mounted.current) setNotice('No se pudo guardar el borrador. Puedes seguir durante esta sesión.');
    });
    draftWriteQueue = writes.current;
  }

  function changeSource(value: string) {
    published.current = false;
    latestDraft.current = { ...latestDraft.current, source: value };
    setSource(value); setParsed(null); setReviewed(false); setError(''); setNotice('');
  }

  function useExample(language: 'es' | 'en') {
    if (source.trim()) setUndoText(source);
    changeSource(language === 'en' ? exampleRecipeTextEnglish : exampleRecipeText);
    setChooseExample(false);
    if (!imageUri) { latestDraft.current = { ...latestDraft.current, examplePhoto: true }; setExamplePhoto(true); }
    setNotice(imageUri ? 'Ejemplo cargado. Conservamos tu foto.' : 'Ejemplo cargado con una foto de muestra.');
  }

  function clearText() {
    setUndoText(source); changeSource(''); setNotice('Texto vaciado. Puedes deshacerlo.');
  }

  async function paste() {
    setBusyPaste(true); setError('');
    try {
      const value = await Clipboard.getStringAsync();
      if (!mounted.current) return;
      if (!value.trim()) { setError('No hay texto en el portapapeles. Copia una receta y vuelve a intentarlo.'); return; }
      if (source.trim()) setUndoText(source);
      changeSource(value.slice(0, 16000));
      if (value.length > 16000) setNotice('Pegamos los primeros 16.000 caracteres. Revisa que la receta esté completa.');
    } catch { setError('No pudimos leer el portapapeles. Mantén pulsado el campo de texto para pegar tu receta.'); }
    finally { if (mounted.current) setBusyPaste(false); }
  }

  async function pickImage() {
    setBusyImage(true); setError('');
    try {
      const uri = await onPickImage();
      if (!mounted.current) return;
      if (uri) {
        published.current = false;
        latestDraft.current = { ...latestDraft.current, imageUri: uri, examplePhoto: false };
        setImageUri(uri); setExamplePhoto(false); setNotice('');
      }
    } catch { setError('No pudimos abrir esa foto. Prueba de nuevo desde tu galería.'); }
    finally { if (mounted.current) setBusyImage(false); }
  }

  function removeImage() {
    published.current = false;
    latestDraft.current = { ...latestDraft.current, imageUri: null, examplePhoto: false };
    setImageUri(null); setExamplePhoto(false); setReviewed(false);
  }

  function convert() {
    if (!source.trim()) { setError('Escribe o pega una receta para convertirla.'); return; }
    Keyboard.dismiss();
    setParsed(parseRecipeText(source)); setReviewed(false); setExpanded(null); setShowClarity(false); setError(''); setNotice('');
    scroll.current?.scrollTo({ y: 0, animated: true });
  }

  function publish() {
    if (!parsed || busyPublish) return;
    if (parsed.title === 'Tu nueva receta' || !parsed.ingredients.length || !parsed.steps.length) {
      setError('Completa el título, los ingredientes y la preparación en el texto original.'); return;
    }
    if (!imageUri && !examplePhoto) { setError('Añade una foto para publicar. La imagen de la vista previa es solo de ejemplo.'); return; }
    if (!reviewed) { setError('Revisa la receta detectada y marca la casilla antes de compartirla.'); return; }
    setBusyPublish(true); setError('');
    const recipe: SocialRecipe = {
      id: `local-${Date.now()}`,
      title: parsed.title,
      subtitle: parsed.description || 'Una receta para compartir el antojo.',
      description: parsed.description || 'De mi cocina a tu mesa.',
      author: { id: 'me', ...profile, followers: '0' },
      image: imageUri ? { uri: imageUri } : demoImage,
      imageCredit: imageUri ? 'Imagen elegida por el autor.' : 'Imagen de ejemplo de RECEPY, creada con generación de imágenes.',
      likes: 0, comments: 0, tags: ['Mi receta'], rawText: source,
    };
    try {
      onPublish(recipe);
      published.current = true;
      if (debounce.current) { clearTimeout(debounce.current); debounce.current = null; }
      latestDraft.current = { source: '', imageUri: null, examplePhoto: false };
      setSource(''); setImageUri(null); setExamplePhoto(false); setParsed(null); setReviewed(false); setUndoText('');
      writes.current = draftWriteQueue.then(() => AsyncStorage.removeItem(DRAFT_KEY)).catch(() => {});
      draftWriteQueue = writes.current;
    } catch { setError('No pudimos guardar esta publicación. Tu borrador sigue aquí para intentarlo de nuevo.'); }
    finally { if (mounted.current) setBusyPublish(false); }
  }

  const image = imageUri ? { uri: imageUri } : examplePhoto ? demoImage : null;
  const ready = Boolean(parsed && parsed.ingredients.length && parsed.steps.length && parsed.title !== 'Tu nueva receta');
  const clarity = parsed ? reviewRecipeClarity(parsed) : [];

  return <ScrollView ref={node => { scroll.current = node; }} style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
    <View style={styles.intro}>
      <Text accessibilityRole="header" style={[common.title, styles.title]}>{parsed ? 'Revisar receta' : 'Crear receta'}</Text>
      <Text style={[common.body, styles.subtitle]}>{parsed ? 'Comprueba el resultado antes de publicar.' : 'Pega tu receta en español o inglés.'}</Text>
    </View>

    {!parsed ? <>
      <View style={styles.sourceToolbar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Elegir idioma del ejemplo" accessibilityState={{expanded:chooseExample}} disabled={!loaded} onPress={() => setChooseExample(!chooseExample)} style={({ pressed }) => [styles.utility, pressed && styles.pressed]}><Icon name="sparkles-outline" color={colors.red} size={16}/><Text style={styles.utilityText}>Ejemplo</Text><Icon name={chooseExample?'chevron-up':'chevron-down'} size={12} color={colors.muted}/></Pressable>
        <Pressable accessibilityRole="button" disabled={!loaded || busyPaste} onPress={() => void paste()} style={({ pressed }) => [styles.utility, pressed && styles.pressed]}>{busyPaste ? <ActivityIndicator size="small" color={colors.muted}/> : <Icon name="clipboard-outline" size={16} color={colors.muted}/>}<Text style={styles.utilityText}>Pegar</Text></Pressable>
        <View style={{ flex: 1 }}/>{source ? <IconButton name="trash-outline" label="Vaciar el texto de la receta" size={34} onPress={clearText}/> : undoText ? <Pressable onPress={() => { changeSource(undoText); setUndoText(''); }} accessibilityRole="button" style={styles.undo}><Text style={styles.undoText}>Deshacer</Text></Pressable> : null}
      </View>
      {chooseExample && <View style={styles.exampleChoices}>{(['es','en'] as const).map(language=><Pressable key={language} accessibilityRole="button" accessibilityLabel={language==='es'?'Cargar ejemplo en español':'Load English example'} onPress={()=>useExample(language)} style={styles.utility}><Text style={styles.utilityText}>{language==='es'?'Español':'English'}</Text></Pressable>)}</View>}
      <View style={styles.editorShell}>
        <View style={styles.editorHeader}><View style={styles.editorDot}/><Text style={styles.editorLabel}>RECETA</Text><Text style={styles.characterCount}>{source.length.toLocaleString('es')}/16.000</Text></View>
        <TextInput
          accessibilityLabel="Texto de la receta" value={source} onChangeText={changeSource}
          editable={loaded} multiline maxLength={16000} placeholder={starter}
          placeholderTextColor={colors.muted} selectionColor={colors.red} textAlignVertical="top"
          style={styles.editor} autoCapitalize="sentences" autoCorrect scrollEnabled={false}
        />
        <View style={styles.editorFooter}><Icon name="lock-closed-outline" size={12} color={colors.muted}/><Text style={styles.editorFooterText}>{loaded ? 'Borrador guardado en este dispositivo' : 'Recuperando tu borrador…'}</Text></View>
      </View>
      <View style={styles.formatTip}><Icon name="information-circle-outline" size={17} color={colors.muted}/><Text style={styles.formatTipText}>Separa <Text style={styles.emphasis}>Ingredientes / Ingredients</Text> y <Text style={styles.emphasis}>Preparación / Directions</Text>. El idioma se detecta solo.</Text></View>
      <PuffyButton title="Convertir receta" icon="sparkles-outline" onPress={convert} disabled={!loaded || !source.trim()} style={styles.convert}/>
      <Text style={styles.localNote}>El texto se procesa en este dispositivo.</Text>
    </> : <>
      <View style={styles.detectedCard}>
        <View style={styles.detectedTop}><View style={styles.detectedBadge}><Icon name="checkmark" size={13} color={colors.green}/><Text style={styles.detectedLabel}>RECETA ORGANIZADA</Text></View><Pressable accessibilityRole="button" onPress={() => { setParsed(null); setReviewed(false); }} style={styles.editText}><Icon name="create-outline" size={14} color={colors.muted}/><Text style={styles.editTextLabel}>Editar texto</Text></Pressable></View>
        <Text style={styles.recipeTitle}>{parsed.title}</Text>{Boolean(parsed.description) && <Text style={styles.recipeDescription}>{parsed.description}</Text>}
        <Text style={styles.reviewMeta}>{parsed.language==='en'?'English':'Español'} · {parsed.servings} porciones{parsed.totalMinutes ? ` · ${parsed.totalMinutes} min` : ''}</Text>
        <Pressable accessibilityRole="button" onPress={() => setExpanded(expanded === 'ingredients' ? null : 'ingredients')} style={styles.accordionHeader}><Text style={styles.accordionTitle}>Ingredientes</Text><Text style={styles.accordionCount}>{parsed.ingredients.length}</Text><Icon name={expanded === 'ingredients' ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted}/></Pressable>
        {expanded === 'ingredients' && <View style={styles.accordionBody}>{parsed.ingredients.length ? parsed.ingredients.map(ingredient => <View key={ingredient.id} style={styles.ingredientRow}><View style={styles.ingredientDot}/><Text style={styles.ingredientName}>{ingredient.name}</Text><Text style={styles.ingredientAmount}>{scaleIngredient(ingredient, parsed.servings, parsed.servings)}</Text></View>) : <Text style={styles.missingText}>Añade ingredientes al texto para completar esta receta.</Text>}</View>}
        <Pressable accessibilityRole="button" onPress={() => setExpanded(expanded === 'steps' ? null : 'steps')} style={styles.accordionHeader}><Text style={styles.accordionTitle}>El paso a paso</Text><Text style={styles.accordionCount}>{parsed.steps.length}</Text><Icon name={expanded === 'steps' ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted}/></Pressable>
        {expanded === 'steps' && <View style={styles.accordionBody}>{parsed.steps.length ? parsed.steps.map((step, index) => <View key={step.id} style={styles.stepRow}><Text style={styles.stepNumber}>{String(index + 1).padStart(2, '0')}</Text><View style={{ flex: 1 }}><Text style={styles.stepTitle}>{step.title}</Text><Text style={styles.stepInstruction}>{step.instruction}</Text></View></View>) : <Text style={styles.missingText}>Añade la preparación. La conversión no inventa instrucciones.</Text>}</View>}
      </View>
      {clarity.length>0&&<View style={styles.clarity}><Pressable accessibilityRole="button" accessibilityState={{expanded:showClarity}} onPress={()=>setShowClarity(!showClarity)} style={styles.clarityToggle}><Icon name="bulb-outline" size={18} color={colors.red}/><Text style={styles.clarityTitle}>Hacerla más clara · {clarity.length}</Text><Icon name={showClarity?'chevron-up':'chevron-down'} size={16} color={colors.muted}/></Pressable>{showClarity&&clarity.map(hint=><View key={hint.id} style={styles.clarityHint}><Text style={styles.clarityHintTitle}>{hint.title}</Text><Text style={styles.clarityHintBody}>{hint.detail}</Text></View>)}</View>}
      {parsed.warnings.length > 0 && <View style={styles.warnings}><View style={styles.warningHeading}><Icon name="information-circle-outline" size={18} color={isDark?'#c9ac81':'#846638'}/><Text style={styles.warningTitle}>Revisa estos detalles</Text></View>{parsed.warnings.map((warning, index) => <View key={index} style={styles.warningRow}><Text style={styles.warningBullet}>·</Text><Text style={styles.warningText}>{warning}</Text></View>)}</View>}
      <Pressable accessibilityRole="button" onPress={() => onPreview(parsed, image || demoImage)} style={({ pressed }) => [styles.previewButton, pressed && styles.pressed]}><View style={styles.previewIcon}><Icon name="hand-left-outline" size={23} color={colors.red}/></View><View style={{ flex: 1 }}><Text style={styles.previewTitle}>Ver receta interactiva</Text></View><Icon name="arrow-forward" size={19} color={colors.muted}/></Pressable>
      {!image && <Text style={styles.imageExampleNote}>Vista previa con foto de ejemplo. Añade una foto para publicar.</Text>}
    </>}

    <View style={styles.photoSection}>
      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Foto</Text>{image&&<IconButton name="close" label="Quitar foto de la receta" size={34} onPress={removeImage}/>}</View>
      <Pressable accessibilityRole="button" accessibilityLabel={image ? 'Cambiar foto de la receta' : 'Elegir foto de la receta'} disabled={busyImage || !loaded} onPress={() => void pickImage()} style={({ pressed }) => [styles.photoPicker, Boolean(image) && styles.photoPickerFilled, pressed && styles.pressed]}>
        {image ? <><Image source={image} style={styles.photoPreview}/><View style={styles.photoOverlay}/><View style={styles.photoCaption}><View style={styles.photoCaptionIcon}>{busyImage ? <ActivityIndicator color="#fff" size="small"/> : <Icon name="camera-outline" size={18} color="#fff"/>}</View><View><Text style={styles.photoCaptionText}>Cambiar foto</Text><Text style={styles.photoCaptionDetail}>{examplePhoto ? 'Imagen de ejemplo' : ''}</Text></View></View></> : <><View style={styles.photoEmptyIcon}>{busyImage ? <ActivityIndicator color={colors.red} size="small"/> : <Icon name="image-outline" size={25} color={colors.red}/>}</View><Text style={styles.photoEmptyTitle}>Elegir foto</Text></>}
      </Pressable>
    </View>

    {parsed && <View style={styles.reviewArea}>
      <Pressable accessibilityRole="checkbox" accessibilityLabel="Revisé la receta detectada" accessibilityState={{ checked: reviewed }} onPress={() => { setReviewed(!reviewed); setError(''); }} style={styles.reviewCheckRow}><View style={[styles.reviewCheckbox, reviewed && styles.reviewCheckboxChecked]}>{reviewed && <Icon name="checkmark" color={colors.onPrimary} size={15}/>}</View><View style={{ flex: 1 }}><Text style={styles.reviewLabel}>He revisado la receta.</Text></View></Pressable>
      <PuffyButton title={busyPublish ? 'Guardando…' : 'Publicar receta'} icon="arrow-up-outline" onPress={publish} disabled={!ready || !reviewed || busyPublish}/>
      <Text style={styles.localNote}>Se guardará solo en este dispositivo.</Text>
    </View>}
    {Boolean(error) && <View accessibilityRole="alert" style={styles.errorBox}><Icon name="alert-circle-outline" size={17} color={colors.red}/><Text style={styles.errorText}>{error}</Text></View>}
    {Boolean(notice) && <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}
  </ScrollView>;
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 25, paddingBottom: 130 },
  intro: { marginBottom: 24 }, title: { color: colors.text, marginTop: 0, fontSize: 29, lineHeight: 34, letterSpacing: -1 },
  subtitle: { color: colors.muted, maxWidth: 560, marginTop: 10, fontSize: 13, lineHeight: 20 },
  flow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 }, flowItem: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 7 },
  flowNumber: { width: 23, height: 23, borderRadius: 9, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  flowActive: { borderColor: colors.red, backgroundColor: colors.redTint }, flowNumberText: { color: colors.muted, fontSize: 10, fontWeight: '700' }, flowLabel: { color: colors.muted, fontSize: 10, fontWeight: '500' }, flowLine: { flex: 1, height: 1, backgroundColor: colors.border, marginHorizontal: 5 },
  sourceToolbar: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 13 }, utility: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius:999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, utilityText: { color: colors.text, fontSize: 12, fontWeight: '500' }, pressed: { opacity: .65 },
  exampleChoices: { flexDirection:'row', gap:9, marginBottom:15 },
  clarity: { borderRadius:22, borderWidth:1, borderColor:colors.border, marginTop:16, backgroundColor:colors.surface, paddingHorizontal:16 }, clarityToggle: { minHeight:58, flexDirection:'row', alignItems:'center', gap:10, borderRadius:999 }, clarityTitle: { flex:1, fontSize:12, fontWeight:'600', color:colors.text }, clarityHint: { paddingBottom:16, paddingTop:3 }, clarityHintTitle: { fontSize:12, fontWeight:'600', color:colors.text }, clarityHintBody: { marginTop:6, color:colors.muted, fontSize:12, lineHeight:19 },
  undo: { padding: 8 }, undoText: { color: colors.red, fontSize: 11 },
  editorShell: { backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }, editorHeader: { paddingHorizontal: 16, paddingTop: 16, flexDirection: 'row', alignItems: 'center', gap: 7 }, editorDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.red }, editorLabel: { fontSize: 7, letterSpacing: 1.1, color: colors.muted, fontWeight: '600', flex: 1 }, characterCount: { fontSize: 8, color: colors.muted },
  editor: { color: colors.text, fontSize: 15, lineHeight: 24, minHeight: 300, padding: 17, paddingTop: 20 }, editorFooter: { borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }, editorFooterText: { fontSize: 9, color: colors.muted },
  formatTip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 16, marginBottom: 22 }, formatTipText: { flex: 1, color: colors.muted, fontSize: 10, lineHeight: 17 }, emphasis: { color: colors.text }, convert: { marginBottom: 3 }, localNote: { fontSize: 9, lineHeight: 16, color: colors.muted, textAlign: 'center', marginTop: 13, paddingHorizontal: 10 },
  detectedCard: { borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 19 }, detectedTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7, marginBottom: 19 }, detectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 }, detectedLabel: { color: colors.green, fontSize: 7, letterSpacing: 1.1, fontWeight: '600' }, editText: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5 }, editTextLabel: { fontSize: 9, color: colors.muted }, recipeTitle: { color: colors.text, fontSize: 26, fontWeight: '700', letterSpacing: -.8, lineHeight: 30 }, recipeDescription: { fontSize: 11, lineHeight: 19, color: colors.muted, marginTop: 12 },
  reviewMeta: { color: colors.muted, fontSize: 12, marginTop: 15, marginBottom: 18 },
  metrics: { flexDirection: 'row', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.raised, borderRadius: 16, marginTop: 21, marginBottom: 21, paddingVertical: 14 }, metric: { flex: 1, alignItems: 'center', gap: 6 }, metricValue: { color: colors.text, fontSize: 18, fontWeight: '600' }, metricLabel: { color: colors.muted, fontSize: 8 },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 17, borderTopWidth: 1, borderTopColor: colors.border }, accordionTitle: { color: colors.text, fontSize: 11, fontWeight: '600', flex: 1 }, accordionCount: { fontSize: 9, color: colors.muted }, accordionBody: { paddingBottom: 12 }, ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 11 }, ingredientDot: { height: 5, width: 5, borderRadius: 3, backgroundColor: colors.green }, ingredientName: { color: colors.text, fontSize: 13, flex: 1 }, ingredientAmount: { color: colors.muted, fontSize: 12 }, stepRow: { flexDirection: 'row', gap: 12, paddingVertical: 13 }, stepNumber: { fontSize: 18, fontWeight: '700', color: colors.red }, stepTitle: { color: colors.text, fontSize: 11, fontWeight: '600' }, stepInstruction: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 7 }, missingText: { color: colors.muted, fontSize: 11, lineHeight: 18, paddingVertical: 10 },
  warnings: { borderRadius: 17, padding: 16, marginTop: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: isDark?'#3b3222':'#c9ad78' }, warningHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }, warningTitle: { color: isDark?'#c0ac89':'#75592e', fontSize: 11, fontWeight: '600' }, warningRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 7 }, warningBullet: { color: isDark?'#a18b62':'#806237', fontSize: 17, lineHeight: 17 }, warningText: { flex: 1, color: isDark?'#b3a081':'#755c38', fontSize: 12, lineHeight: 19 },
  previewButton: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius:999, padding: 15, marginTop: 20 }, previewIcon: { width: 42, height: 42, borderRadius:21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.raised }, previewTitle: { color: colors.text, fontSize: 14, lineHeight: 17, fontWeight: '600' }, previewDescription: { color: colors.muted, fontSize: 9, lineHeight: 15, marginTop: 5 }, imageExampleNote: { fontSize: 9, color: colors.muted, lineHeight: 16, marginTop: 10, marginHorizontal: 7 },
  photoSection: { marginTop: 31 }, sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 14 }, sectionTitle: { flex: 1, color: colors.text, fontSize: 12, fontWeight: '600' }, optionalTag: { fontSize: 6, letterSpacing: 1, color: colors.muted, fontWeight: '600' }, photoPicker: { height: 140, borderRadius:70, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, photoPickerFilled: { height: 215, borderRadius: 22, borderStyle: 'solid', borderColor: colors.border, alignItems: 'stretch' }, photoEmptyIcon: { width: 44, height: 44, borderRadius:22, backgroundColor: colors.raised, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 13 }, photoEmptyTitle: { color: colors.text, fontSize: 12, fontWeight: '600' }, photoEmptyBody: { color: colors.muted, fontSize: 9, marginTop: 8, textAlign: 'center', paddingHorizontal: 30 }, photoAdd: { position: 'absolute', right: 15, top: 15, width: 26, height: 26, borderRadius:13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.raised, borderWidth: 1, borderColor: colors.border }, photoPreview: { position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' }, photoOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#00000033' }, photoCaption: { position: 'absolute', left: 16, bottom: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }, photoCaptionIcon: { height: 35, width: 35, borderRadius:18, backgroundColor: '#17120fbf', borderWidth: 1, borderColor: '#ffffff35', alignItems: 'center', justifyContent: 'center' }, photoCaptionText: { color: '#fff9ec', fontSize: 11, fontWeight: '600' }, photoCaptionDetail: { fontSize: 8, color: '#e5d7bc', marginTop: 4 },
  reviewArea: { marginTop: 26 }, reviewCheckRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 23, paddingVertical: 8 }, reviewCheckbox: { height: 23, width: 23, borderRadius:12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, reviewCheckboxChecked: { borderColor: colors.red, backgroundColor: colors.red }, reviewLabel: { color: colors.text, fontSize: 13, fontWeight: '500', marginTop: 2 }, reviewDetail: { color: colors.muted, fontSize: 9, lineHeight: 16, marginTop: 6 }, errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderColor: isDark?'#663226':'#d4a494', borderRadius: 13, backgroundColor: isDark?'#2a1711':'#efd8ca', padding: 13, marginTop: 20 }, errorText: { color: isDark?'#df9c88':'#8d3527', fontSize: 11, lineHeight: 18, flex: 1 }, notice: { color: colors.muted, fontSize: 10, lineHeight: 18, textAlign: 'center', marginTop: 18, paddingHorizontal: 10 },
});
