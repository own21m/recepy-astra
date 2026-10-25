import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, type DimensionValue, type ImageSourcePropType } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import * as Speech from 'expo-speech';
import { useTheme, useThemeStyles, type ThemeColors } from '../theme';
import { Icon, IconButton, PuffyButton, feedback, FadeIn } from '../components/primitives';
import { type ParsedRecipe, scaleIngredient, formatDuration } from '../domain/recipeParser';
import { buildStepGuide, instructionWithoutTitle } from '../domain/cookingGuide';

export type CookingProgress = {
  checked: string[]; completed: string[]; servings: number; stepIndex: number;
  mode?: 'guided' | 'overview'; tab?: 'ingredients' | 'steps';
  timer?: { stepId: string; endAt: number | null; remaining: number; running: boolean };
};
type Props = {
  recipe: ParsedRecipe; image: ImageSourcePropType; authorName?: string;
  progress?: CookingProgress; onProgress: (value: CookingProgress) => void;
  saved: boolean; onSave: () => void; preview?: boolean;
};

export function RecipeScreen({ recipe: r, image, authorName, progress, onProgress, saved, onSave, preview = false }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useThemeStyles(createStyles);
  const p: CookingProgress = progress || { checked: [], completed: [], servings: r.servings, stepIndex: 0 };
  const cooking = p.mode === 'guided';
  const tab = p.tab || 'ingredients';
  const [now, setNow] = useState(Date.now());
  const [notice, setNotice] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [showWarnings, setShowWarnings] = useState(false);
  const [restartRequested, setRestartRequested] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceHelp, setVoiceHelp] = useState(false);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const speechRequest = useRef(0);
  const index = Math.min(Math.max(0, p.stepIndex), Math.max(0, r.steps.length - 1));
  const step = r.steps[index];
  const timer = p.timer;
  const remaining = timer?.running && timer.endAt ? Math.max(0, Math.ceil((timer.endAt - now) / 1000)) : timer?.remaining || 0;
  const completedCount = r.steps.filter(item => p.completed.includes(item.id)).length;
  const preparedCount = r.ingredients.filter(item => p.checked.includes(item.id)).length;
  const allDone = r.steps.length > 0 && completedCount === r.steps.length;
  const instruction = step ? instructionWithoutTitle(step.instruction, step.title) : '';
  const guide = useMemo(() => buildStepGuide(step?.instruction || ''), [step?.instruction]);
  const actions = useMemo(() => buildStepGuide(instruction).actions, [instruction]);
  const matchedIngredients = useMemo(() => r.ingredients.filter(item => step?.ingredientIds.includes(item.id)), [r.ingredients, step]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 500);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') setNow(Date.now()); });
    return () => { clearInterval(interval); subscription.remove(); };
  }, []);
  useEffect(() => {
    if (timer?.running && remaining === 0) {
      onProgress({ ...p, timer: { ...timer, running: false, endAt: null, remaining: 0 } });
      setNotice('Tiempo cumplido. Comprueba el punto de tu preparación.'); feedback('success');
    }
  }, [remaining, timer?.running]);
  useEffect(() => {
    speechRequest.current += 1; void Speech.stop().catch(() => {});
    setSpeaking(false); setHelpOpen(false); setVoiceHelp(false);
    scroll.current?.scrollTo({ y: 0, animated: false });
    return () => { speechRequest.current += 1; void Speech.stop().catch(() => {}); };
  }, [step?.id, cooking]);

  function patch(value: Partial<CookingProgress>) { onProgress({ ...p, ...value }); }
  function toggleIngredient(id: string) {
    feedback(); patch({ checked: p.checked.includes(id) ? p.checked.filter(item => item !== id) : [...p.checked, id] });
  }
  function enterGuide(stepIndex = p.stepIndex) {
    if (allDone) { setRestartRequested(true); return; }
    patch({ mode: 'guided', tab: 'steps', stepIndex }); setNotice('');
  }
  function restart() {
    patch({ completed: [], stepIndex: 0, timer: undefined, mode: 'guided', tab: 'steps' });
    setRestartRequested(false); setNotice('');
  }
  function next() {
    if (!step) return;
    feedback('success');
    const completed = p.completed.includes(step.id) ? p.completed : [...p.completed, step.id];
    const pending = r.steps.map((item, i) => ({ item, i })).filter(({ item }) => !completed.includes(item.id));
    const nextIndex = pending.find(({ i }) => i > index)?.i ?? pending[0]?.i ?? index;
    patch({ completed, stepIndex: nextIndex, ...(pending.length ? {} : { timer: undefined }) }); setNotice('');
  }
  function undoStep(id: string) {
    patch({ completed: p.completed.filter(item => item !== id), stepIndex: Math.max(0, r.steps.findIndex(item => item.id === id)), mode: 'guided', tab: 'steps' });
    setNotice('Paso marcado como pendiente.'); feedback();
  }
  function timerAction() {
    if (!step?.durationSeconds) return;
    if (timer?.running && timer.stepId !== step.id) { setNotice('Hay otro temporizador en marcha. Puedes volver a su paso para pausarlo.'); return; }
    if (timer?.stepId === step.id && timer.running) { patch({ timer: { ...timer, running: false, endAt: null, remaining } }); return; }
    const seconds = timer?.stepId === step.id && timer.remaining > 0 ? timer.remaining : step.durationSeconds;
    setNow(Date.now()); patch({ timer: { stepId: step.id, endAt: Date.now() + seconds * 1000, remaining: seconds, running: true } }); setNotice('');
  }
  function addMinute() {
    if (!timer || timer.stepId !== step?.id) return;
    patch({ timer: { ...timer, remaining: remaining + 60, endAt: timer.running && timer.endAt ? timer.endAt + 60000 : null } });
  }
  async function readStep() {
    const request = ++speechRequest.current;
    if (speaking) { setSpeaking(false); await Speech.stop().catch(() => {}); return; }
    if (!step) return;
    await Speech.stop().catch(() => {});
    if (request !== speechRequest.current) return;
    setSpeaking(true);
    const done = () => { if (request === speechRequest.current) setSpeaking(false); };
    try {
      Speech.speak((r.language === 'en' ? 'Step ' : 'Paso ') + (index + 1) + '. ' + step.instruction, {
        language: r.language === 'en' ? 'en-US' : 'es-ES', rate: .92,
        onDone: done, onStopped: done,
        onError: () => { done(); setNotice('No pudimos leer este paso. Puedes seguir leyéndolo aquí.'); },
      });
    } catch { done(); setNotice('La lectura en voz alta no está disponible en este dispositivo.'); }
  }
  function showOverview() { patch({ mode: 'overview', tab: 'steps' }); setNotice(''); }
  function openStep(stepIndex: number) { patch({ mode: 'guided', tab: 'steps', stepIndex }); setNotice(''); }

  return <View style={styles.screen}>
    {cooking && !allDone && <KeepCookingAwake />}
    <ScrollView ref={scroll} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {!cooking ? <>
        <View style={styles.recipeHeading}>
          <View style={styles.headingCopy}><Text accessibilityRole="header" style={styles.recipeTitle}>{r.title}</Text>{authorName && <Text style={styles.byline}>Por {authorName}</Text>}</View>
          <Image source={image} style={styles.thumbnail} />
        </View>
        <View style={styles.metaRow}>
          <View style={styles.meta}><Icon name="time-outline" size={15} color={colors.muted}/><Text style={styles.metaText}>{r.totalMinutes ? r.totalMinutes + ' min' : 'A tu ritmo'}</Text></View>
          <Text style={styles.metaText}>{r.servings} porciones</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={saved ? 'Quitar del recetario' : 'Guardar receta'} onPress={onSave} style={styles.save}><Icon name={saved ? 'bookmark' : 'bookmark-outline'} size={18} color={saved ? colors.red : colors.muted}/><Text style={[styles.metaText, saved && { color: colors.red }]}>{saved ? 'Guardada' : 'Guardar'}</Text></Pressable>
        </View>
        {!!r.description && <Text style={styles.description}>{r.description}</Text>}
        <View style={styles.tabbar}>{([{ id: 'ingredients', label: 'Ingredientes' }, { id: 'steps', label: 'Receta completa' }] as const).map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: tab === item.id }} onPress={() => patch({ tab: item.id })} style={[styles.tab, tab === item.id && styles.tabActive]}><Text style={[styles.tabText, tab === item.id && styles.tabTextActive]}>{item.label}</Text></Pressable>)}</View>
        {tab === 'ingredients' ? <>
          <View style={styles.sectionTop}><View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Antes de empezar</Text><Text style={styles.sectionSubtitle}>Marca lo que tienes preparado.</Text></View><View style={styles.servings}><IconButton size={42} name="remove" label="Menos porciones" onPress={() => patch({ servings: Math.max(1, p.servings - 1) })}/><View style={styles.servingsNumber}><Text style={styles.servingsValue}>{p.servings}</Text><Text style={styles.servingsLabel}>PORCIONES</Text></View><IconButton size={42} name="add" label="Más porciones" onPress={() => patch({ servings: Math.min(24, p.servings + 1) })}/></View></View>
          <View style={styles.checkProgress}><Text style={styles.checkProgressText}>{preparedCount} de {r.ingredients.length} listos</Text><Pressable accessibilityRole="button" style={styles.textButton} onPress={() => patch({ checked: preparedCount === r.ingredients.length ? [] : r.ingredients.map(item => item.id) })}><Text style={styles.smallLink}>{preparedCount === r.ingredients.length ? 'Desmarcar todos' : 'Tengo todo'}</Text><Icon name="checkmark" size={15} color={colors.muted}/></Pressable></View>
          <View style={styles.ingredients}>{r.ingredients.map(item => {
            const checked = p.checked.includes(item.id);
            return <Pressable key={item.id} accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={item.name + ', ' + scaleIngredient(item, r.servings, p.servings)} onPress={() => toggleIngredient(item.id)} style={[styles.ingredient, checked && styles.ingredientChecked]}><View style={[styles.checkbox, checked && styles.checkboxChecked]}>{checked && <Icon name="checkmark" size={14} color={colors.background}/>}</View><View style={styles.ingredientCopy}><Text style={[styles.ingredientName, checked && styles.ingredientNameChecked]}>{item.name}</Text>{item.optional && <Text style={styles.optional}>Opcional</Text>}</View><Text style={styles.ingredientAmount}>{scaleIngredient(item, r.servings, p.servings)}</Text></Pressable>;
          })}</View>
        </> : <>
          <View style={styles.sectionTop}><Text style={styles.sectionTitle}>Preparación completa</Text><Text style={styles.sectionSubtitle}>{r.steps.length} pasos</Text></View>
          <View style={styles.overviewSteps}>{r.steps.map((item, itemIndex) => <View key={item.id} style={styles.overviewStep}>
            <View style={styles.overviewTop}><View style={[styles.overviewNumber, p.completed.includes(item.id) && styles.numberDone]}>{p.completed.includes(item.id) ? <Icon name="checkmark" size={16} color={colors.green}/> : <Text style={styles.overviewNumberText}>{itemIndex + 1}</Text>}</View><Text style={styles.overviewTitle}>{item.title}</Text>{item.durationSeconds ? <Text style={styles.overviewTime}>{formatDuration(item.durationSeconds)}</Text> : null}</View>
            {!!instructionWithoutTitle(item.instruction, item.title) && <Text selectable style={styles.overviewInstruction}>{instructionWithoutTitle(item.instruction, item.title)}</Text>}
            {!allDone && <Pressable accessibilityRole="button" accessibilityLabel={'Guiarme desde el paso ' + (itemIndex + 1)} onPress={() => openStep(itemIndex)} style={styles.overviewGuide}><Text style={styles.smallLink}>Guiarme desde aquí</Text><Icon name="arrow-forward" size={14} color={colors.muted}/></Pressable>}
          </View>)}</View>
        </>}
        <View style={styles.sourceActions}><Pressable accessibilityRole="button" onPress={() => setShowSource(!showSource)} style={styles.textButton}><Icon name="document-text-outline" size={15} color={colors.muted}/><Text style={styles.smallLink}>{showSource ? 'Ocultar original' : 'Texto original'}</Text></Pressable>{r.warnings.length > 0 && <Pressable accessibilityRole="button" accessibilityState={{ expanded: showWarnings }} onPress={() => setShowWarnings(!showWarnings)} style={styles.textButton}><Icon name="information-circle-outline" size={16} color={colors.muted}/><Text style={styles.smallLink}>{r.warnings.length} {r.warnings.length === 1 ? 'aviso' : 'avisos'}</Text><Icon name={showWarnings ? 'chevron-up' : 'chevron-down'} size={13} color={colors.muted}/></Pressable>}</View>
        {showSource && <Text selectable style={styles.sourceText}>{r.sourceText}</Text>}
        {showWarnings && <View style={styles.warningList}>{r.warnings.map((warning, warningIndex) => <Text key={warningIndex} style={styles.warningText}>• {warning}</Text>)}</View>}
      </> : step && <FadeIn key={allDone ? 'finished' : step.id}>
        <View style={styles.cookHeader}><Text style={styles.cookingRecipe} numberOfLines={1}>{r.title}</Text><Pressable accessibilityRole="button" onPress={showOverview} style={styles.textButton}><Icon name="list-outline" size={16} color={colors.muted}/><Text style={styles.smallLink}>Vista completa</Text></Pressable></View>
        <View style={styles.progressRow}><View style={styles.progressTrack}><View style={[styles.progressFill, { width: (completedCount / r.steps.length * 100 + '%') as DimensionValue }]}/></View><Text style={styles.progressLabel}>{completedCount}/{r.steps.length}</Text></View>
        {allDone ? <View style={styles.done}>
          <View style={styles.doneIcon}><Icon name="checkmark" size={39} color={colors.green}/></View><Text style={styles.doneTitle}>Listo para servir</Text><Text style={styles.doneBody}>Has completado todos los pasos.</Text>
          <PuffyButton title="Volver a la receta" onPress={() => patch({ mode: 'overview', tab: 'ingredients' })} style={styles.doneAction}/>
          <Pressable accessibilityRole="button" onPress={() => undoStep(p.completed.filter(id => r.steps.some(item => item.id === id)).at(-1) || step.id)} style={styles.textButton}><Icon name="arrow-undo-outline" size={15} color={colors.muted}/><Text style={styles.smallLink}>Deshacer último paso</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => setRestartRequested(true)} style={styles.textButton}><Text style={styles.smallLink}>Cocinar de nuevo</Text></Pressable>
        </View> : <>
          <View style={styles.stepEyebrow}><View style={styles.stepNumber}><Text style={styles.stepNumberText}>{String(index + 1).padStart(2, '0')}</Text></View><View style={styles.stepMeta}><Text style={styles.stepOf}>PASO {index + 1} DE {r.steps.length}</Text>{p.completed.includes(step.id) && <Text style={styles.stepStatus}>Completado</Text>}</View><IconButton name={speaking ? 'stop-circle-outline' : 'volume-high-outline'} label={speaking ? 'Detener lectura' : 'Escuchar este paso'} active={speaking} size={46} onPress={() => { void readStep(); }}/></View>
          <Text accessibilityRole="header" style={styles.stepTitle}>{step.title}</Text>
          <View style={styles.actionsList}>{actions.map((action, actionIndex) => <View key={step.id + '-' + actionIndex} style={styles.instructionRow}>{actions.length > 1 && <Text style={styles.actionNumber}>{actionIndex + 1}</Text>}<Text selectable style={styles.instruction}>{action}</Text></View>)}</View>
          {!!guide.temperatures.length && <View style={styles.factRow}><Icon name="thermometer-outline" size={17} color={colors.red}/><Text style={styles.factText}>{guide.temperatures.join(' · ')}</Text><Text style={styles.factCaption}>Según la receta</Text></View>}
          {!!guide.signals.length && <View style={styles.signalBox}><Text style={styles.smallHeading}>EL PUNTO QUE BUSCAS</Text>{guide.signals.map(signal => <Text key={signal} style={styles.signalText}>{signal}</Text>)}</View>}
          {!!matchedIngredients.length && <View style={styles.inThisStep}><Text style={styles.smallHeading}>PREPARA PARA ESTE PASO</Text><View style={styles.ingredientChips}>{matchedIngredients.map(item => <Pressable key={item.id} accessibilityRole="checkbox" accessibilityState={{ checked: p.checked.includes(item.id) }} accessibilityLabel={item.name + ', ' + scaleIngredient(item, r.servings, p.servings) + ', preparado'} onPress={() => toggleIngredient(item.id)} style={[styles.ingredientChip, p.checked.includes(item.id) && styles.chipChecked]}><Icon name={p.checked.includes(item.id) ? 'checkmark-circle' : 'ellipse-outline'} size={17} color={p.checked.includes(item.id) ? colors.green : colors.muted}/><Text style={styles.ingredientChipName}>{scaleIngredient(item, r.servings, p.servings)} {item.name}</Text></Pressable>)}</View></View>}
          {step.durationSeconds ? <View style={styles.timerCard}>
            <View style={styles.timerTop}><Icon name="timer-outline" size={18} color={colors.red}/><Text style={styles.timerLabel}>Tiempo del paso</Text></View><View style={styles.timerMain}><View><Text style={styles.timerDigits}>{formatDuration(timer?.stepId === step.id ? remaining : step.durationSeconds)}</Text><Text style={styles.timerCaption}>{timer?.stepId === step.id && timer.running ? 'En marcha' : 'Inicia cuando comience la cocción'}</Text></View><IconButton name={timer?.stepId === step.id && timer.running ? 'pause' : 'play'} label={timer?.stepId === step.id && timer.running ? 'Pausar temporizador' : 'Iniciar temporizador'} onPress={timerAction} active size={52}/></View>
            {timer?.stepId === step.id && <View style={styles.timerTools}><Pressable accessibilityRole="button" onPress={addMinute} style={styles.timerTool}><Text style={styles.smallLink}>+1 min</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Reiniciar temporizador" onPress={() => patch({ timer: { stepId: step.id, endAt: null, remaining: step.durationSeconds || 0, running: false } })} style={styles.timerTool}><Icon name="refresh-outline" size={14} color={colors.muted}/><Text style={styles.smallLink}>Reiniciar</Text></Pressable></View>}
          </View> : <Text style={styles.noTimer}>Sigue los tiempos y el punto indicados en el texto de este paso.</Text>}
          {timer?.running && timer.stepId !== step.id && <Pressable accessibilityRole="button" accessibilityLabel="Ir al paso del temporizador activo" onPress={() => patch({ stepIndex: Math.max(0, r.steps.findIndex(item => item.id === timer.stepId)) })} style={styles.backgroundTimer}><Icon name="timer-outline" size={18} color={colors.red}/><Text style={styles.backgroundTimerText}>Temporizador activo · {formatDuration(remaining)}</Text><Icon name="arrow-forward" size={17} color={colors.muted}/></Pressable>}
          {guide.techniques.length > 0 && <Pressable accessibilityRole="button" accessibilityState={{ expanded: helpOpen }} onPress={() => setHelpOpen(!helpOpen)} style={styles.helpToggle}><Icon name="help-circle-outline" size={20} color={colors.muted}/><Text style={styles.smallLink}>Necesito una mano</Text><Icon name={helpOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.muted}/></Pressable>}
          {helpOpen && <View style={styles.helpBox}>{guide.techniques.map(technique => <View key={technique.id} style={styles.technique}><Text style={styles.techniqueTitle}>{technique.label}</Text><Text style={styles.techniqueText}>{technique.explanation}</Text></View>)}</View>}
          {speaking && <Pressable accessibilityRole="button" onPress={() => setVoiceHelp(!voiceHelp)} style={styles.textButton}><Text style={styles.smallLink}>{voiceHelp ? 'Ocultar ayuda de voz' : '¿No se oye?'}</Text></Pressable>}
          {voiceHelp && <Text style={styles.noTimer}>{Platform.OS === 'ios' ? 'Desactiva el modo silencio del iPhone y comprueba el volumen. La voz depende de los idiomas disponibles en tu dispositivo.' : 'Comprueba el volumen y las voces disponibles en tu dispositivo.'}</Text>}
          {p.completed.includes(step.id) && <Pressable accessibilityRole="button" onPress={() => undoStep(step.id)} style={styles.textButton}><Icon name="arrow-undo-outline" size={15} color={colors.muted}/><Text style={styles.smallLink}>Marcar este paso como pendiente</Text></Pressable>}
          <View style={styles.stepDots}>{r.steps.map((item, itemIndex) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={'Ir al paso ' + (itemIndex + 1) + (p.completed.includes(item.id) ? ', completado' : '')} accessibilityState={{ selected: index === itemIndex }} onPress={() => openStep(itemIndex)} style={[styles.stepDot, itemIndex === index && styles.stepDotCurrent, p.completed.includes(item.id) && styles.stepDotDone]}>{p.completed.includes(item.id) ? <Icon name="checkmark" size={17} color={colors.background}/> : <Text style={styles.stepDotText}>{itemIndex + 1}</Text>}</Pressable>)}</View>
        </>}
      </FadeIn>}
      {!!notice && <View accessibilityLiveRegion="polite" style={styles.notice}><Icon name="information-circle-outline" size={18} color={colors.green}/><Text style={styles.noticeText}>{notice}</Text></View>}
    </ScrollView>
    {restartRequested && <View style={styles.restartPanel}><Text style={styles.restartTitle}>¿Empezar de nuevo?</Text><Text style={styles.restartCopy}>Se reinician los pasos y el temporizador. Tus ingredientes preparados se mantienen.</Text><View style={styles.restartActions}><Pressable accessibilityRole="button" onPress={() => setRestartRequested(false)} style={styles.cancelRestart}><Text style={styles.smallLink}>Cancelar</Text></Pressable><PuffyButton small title="Reiniciar" onPress={restart}/></View></View>}
    {!restartRequested && cooking && !allDone && <View style={styles.footer}><View style={styles.cookNavigation}>{index > 0 && <IconButton name="arrow-back" label="Paso anterior" onPress={() => openStep(index - 1)}/>}<View style={styles.cookNext}><PuffyButton title={p.completed.includes(step?.id) ? 'Continuar' : completedCount === r.steps.length - 1 ? 'Terminar receta' : 'Hecho, siguiente'} icon="checkmark" onPress={next}/></View></View></View>}
    {!restartRequested && !cooking && <View style={styles.footer}><PuffyButton title={allDone ? 'Cocinar de nuevo' : completedCount ? 'Continuar guía' : 'Cocinar paso a paso'} icon="restaurant-outline" disabled={!r.steps.length || !r.ingredients.length} onPress={() => enterGuide()}/>{preview && <Text style={styles.previewNote}>Vista previa</Text>}</View>}
  </View>;
}

function KeepCookingAwake() { useKeepAwake('recepy-cooking'); return null; }

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  screen: { flex: 1, minHeight: 0, backgroundColor: colors.background },
  scroll: { padding: 22, paddingBottom: 30, maxWidth: 760, width: '100%', alignSelf: 'center' },
  recipeHeading: { flexDirection: 'row', gap: 18, alignItems: 'center' }, headingCopy: { flex: 1 },
  recipeTitle: { fontSize: 25, lineHeight: 30, fontWeight: '700', letterSpacing: -.8, color: colors.text },
  byline: { fontSize: 11, color: colors.muted, marginTop: 12 }, thumbnail: { width: 78, height: 100, borderRadius: 20, backgroundColor: colors.surface },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 17, paddingVertical: 18, marginTop: 5, borderBottomWidth: 1, borderBottomColor: colors.border },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 }, metaText: { fontSize: 11, color: colors.muted },
  save: { minHeight: 44, marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999 },
  description: { fontSize: 12, lineHeight: 20, color: colors.muted, marginTop: 18, marginBottom: 20 },
  tabbar: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 999, padding: 4, gap: 5, marginTop: 10 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 999 }, tabActive: { backgroundColor: colors.redTint },
  tabText: { fontSize: 12, color: colors.muted }, tabTextActive: { color: colors.red, fontWeight: '600' },
  sectionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 26, marginBottom: 14 }, sectionHeading: { flex: 1 },
  sectionTitle: { fontSize: 16, letterSpacing: -.3, color: colors.text, fontWeight: '600' }, sectionSubtitle: { fontSize: 10, lineHeight: 16, color: colors.muted, marginTop: 6 },
  servings: { flexDirection: 'row', alignItems: 'center', gap: 8 }, servingsNumber: { alignItems: 'center', minWidth: 35 }, servingsValue: { fontSize: 20, color: colors.text, fontWeight: '600' }, servingsLabel: { fontSize: 7, color: colors.muted, letterSpacing: .6, marginTop: 3 },
  checkProgress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }, checkProgressText: { fontSize: 10, color: colors.muted },
  textButton: { minHeight: 44, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 6, alignSelf: 'flex-start' }, smallLink: { fontSize: 11, color: colors.muted },
  ingredients: { borderRadius: 21, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  ingredient: { flexDirection: 'row', minHeight: 62, padding: 15, gap: 11, alignItems: 'center', backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, ingredientChecked: { backgroundColor: isDark ? '#11170e' : '#e1e7d5' },
  ingredientCopy: { flex: 1 }, ingredientName: { fontSize: 14, color: colors.text, lineHeight: 20 }, ingredientNameChecked: { color: colors.muted }, ingredientAmount: { fontSize: 12, color: colors.muted, maxWidth: 110, textAlign: 'right' }, optional: { fontSize: 9, color: colors.muted, marginTop: 5 },
  checkbox: { height: 22, width: 22, borderRadius: 11, borderWidth: 1, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' }, checkboxChecked: { backgroundColor: colors.green, borderColor: colors.green },
  overviewSteps: { gap: 13 }, overviewStep: { padding: 17, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, overviewTop: { flexDirection: 'row', gap: 11, alignItems: 'center' },
  overviewNumber: { width: 31, height: 31, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.raised }, numberDone: { backgroundColor: isDark ? '#22301a' : '#dce4ce' }, overviewNumberText: { fontSize: 11, color: colors.muted }, overviewTitle: { fontSize: 13, lineHeight: 19, color: colors.text, fontWeight: '600', flex: 1 }, overviewTime: { fontSize: 10, color: colors.muted }, overviewInstruction: { fontSize: 14, lineHeight: 23, color: colors.text, marginTop: 14 }, overviewGuide: { minHeight: 44, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'flex-end', borderRadius: 999, marginTop: 5 },
  sourceActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 12, marginTop: 20 }, sourceText: { fontSize: 12, lineHeight: 20, color: colors.muted, backgroundColor: colors.surface, padding: 17, borderRadius: 18 }, warningList: { padding: 16, backgroundColor: colors.surface, borderRadius: 18, gap: 10 }, warningText: { fontSize: 12, lineHeight: 19, color: colors.muted },
  cookHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 }, cookingRecipe: { flex: 1, color: colors.muted, fontSize: 12 }, progressRow: { flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 13, marginBottom: 24 }, progressTrack: { height: 4, borderRadius: 99, backgroundColor: colors.border, flex: 1, overflow: 'hidden' }, progressFill: { height: 4, backgroundColor: colors.red, borderRadius: 99 }, progressLabel: { fontSize: 10, color: colors.muted },
  stepEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22 }, stepNumber: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.raised, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border }, stepNumberText: { fontSize: 23, color: colors.text, fontWeight: '600', letterSpacing: -.8 }, stepMeta: { flex: 1 }, stepOf: { fontSize: 10, letterSpacing: .7, color: colors.muted, fontWeight: '500' }, stepStatus: { marginTop: 6, fontSize: 10, color: colors.green }, stepTitle: { fontSize: 29, lineHeight: 34, color: colors.text, fontWeight: '700', letterSpacing: -.9, marginBottom: 22 },
  actionsList: { gap: 18 }, instructionRow: { flexDirection: 'row', gap: 13, alignItems: 'flex-start' }, actionNumber: { width: 19, fontSize: 11, lineHeight: 28, color: colors.red, fontWeight: '600' }, instruction: { flex: 1, fontSize: 18, lineHeight: 29, color: colors.text },
  factRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 23, paddingVertical: 13, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border }, factText: { fontSize: 14, fontWeight: '600', color: colors.text }, factCaption: { marginLeft: 'auto', fontSize: 9, color: colors.muted },
  signalBox: { padding: 17, borderRadius: 20, backgroundColor: isDark ? '#151a11' : '#e2e8d9', marginTop: 23, gap: 10 }, smallHeading: { fontSize: 9, color: colors.muted, letterSpacing: 1.1, fontWeight: '500' }, signalText: { fontSize: 15, lineHeight: 22, color: colors.green },
  inThisStep: { marginTop: 26 }, ingredientChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13 }, ingredientChip: { paddingHorizontal: 13, minHeight: 42, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 7, maxWidth: '100%' }, chipChecked: { backgroundColor: isDark ? '#11170e' : '#e1e7d5' }, ingredientChipName: { fontSize: 11, color: colors.text, flexShrink: 1, lineHeight: 17 },
  timerCard: { padding: 19, borderRadius: 25, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, marginTop: 28 }, timerTop: { flexDirection: 'row', gap: 8, alignItems: 'center' }, timerLabel: { fontSize: 11, color: colors.muted }, timerMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16 }, timerDigits: { fontSize: 44, fontWeight: '500', letterSpacing: -1.5, fontVariant: ['tabular-nums'], color: colors.text }, timerCaption: { fontSize: 10, color: colors.muted, marginTop: 8, maxWidth: 200, lineHeight: 16 }, timerTools: { flexDirection: 'row', gap: 9, marginTop: 12 }, timerTool: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.border }, noTimer: { fontSize: 11, lineHeight: 18, color: colors.muted, marginTop: 20 },
  backgroundTimer: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, marginTop: 15, borderRadius: 999, borderWidth: 1, borderColor: colors.border }, backgroundTimerText: { fontSize: 11, color: colors.muted, flex: 1 }, helpToggle: { flexDirection: 'row', gap: 8, alignItems: 'center', alignSelf: 'flex-start', minHeight: 46, borderRadius: 999, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.border, marginTop: 24 }, helpBox: { padding: 18, backgroundColor: colors.surface, borderRadius: 21, marginTop: 12, gap: 17 }, technique: { gap: 7 }, techniqueTitle: { fontSize: 13, fontWeight: '600', color: colors.text }, techniqueText: { fontSize: 12, lineHeight: 20, color: colors.muted },
  stepDots: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 9, marginTop: 26 }, stepDot: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, stepDotCurrent: { borderColor: colors.red, backgroundColor: colors.redTint }, stepDotDone: { borderColor: colors.green, backgroundColor: colors.green }, stepDotText: { fontSize: 12, color: colors.text },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 15, marginTop: 15, backgroundColor: colors.surface, borderRadius: 19 }, noticeText: { fontSize: 12, lineHeight: 19, color: colors.green, flex: 1 },
  done: { alignItems: 'center', paddingVertical: 30 }, doneIcon: { height: 74, width: 74, borderRadius: 37, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }, doneTitle: { fontSize: 28, color: colors.text, fontWeight: '700', letterSpacing: -.8, marginTop: 24 }, doneBody: { fontSize: 13, color: colors.muted, marginTop: 12 }, doneAction: { alignSelf: 'stretch', marginTop: 28, marginBottom: 12 },
  footer: { padding: 17, paddingBottom: 13, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background, maxWidth: 760, width: '100%', alignSelf: 'center' }, cookNavigation: { flexDirection: 'row', gap: 12, alignItems: 'center' }, cookNext: { flex: 1 }, previewNote: { marginTop: 9, textAlign: 'center', fontSize: 9, color: colors.muted },
  restartPanel: { padding: 19, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, restartTitle: { fontSize: 16, color: colors.text, fontWeight: '600' }, restartCopy: { fontSize: 12, lineHeight: 19, color: colors.muted, marginTop: 9 }, restartActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 15, marginTop: 14 }, cancelRestart: { paddingHorizontal: 16, minHeight: 44, justifyContent: 'center', borderRadius: 999 },
});
