import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, Image, Keyboard, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { File, Paths } from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';
import { ThemeProvider, useTheme, useThemeStyles, type ThemeColors } from './src/theme';
import * as SystemUI from 'expo-system-ui';
import { FloatingMenu, type Route } from './src/components/FloatingMenu';
import { SheetPanel } from './src/components/SheetPanel';
import { useRecipeOpening } from './src/components/useRecipeOpening';
import { demoRecipes, initialComments, type SocialRecipe, type Creator } from './src/data/recipes';
import { createInitialState, loadState, saveState, type StoredState } from './src/storage';
import { parseRecipeText, type ParsedRecipe } from './src/domain/recipeParser';
import { Icon, IconButton, EmptyState, configureFeedback, feedback } from './src/components/primitives';
import { ExploreScreen, ProfileScreen, SettingsScreen, EditProfileScreen, RecipeGrid } from './src/screens/SecondaryScreens';
import { RecipeScreen, type CookingProgress } from './src/screens/RecipeScreen';
import { ComposeScreen } from './src/screens/ComposeScreen';
import { FeedScreen } from './src/screens/FeedScreen';
import { CommentsScreen, type CommentDraft } from './src/screens/CommentsScreen';

type Sheet={type:'recipe';recipe:SocialRecipe;gestureEntry?:boolean}|{type:'preview';parsed:ParsedRecipe;image:ImageSourcePropType}|{type:'comments';recipe:SocialRecipe}|{type:'creator';creator:Creator}|{type:'edit'}|{type:'settings'}|{type:'activity'};
export default function App(){return <ThemeProvider><SafeAreaProvider><Recepy/></SafeAreaProvider></ThemeProvider>;}

function Recepy(){
  const {colors,isDark}=useTheme();
  const styles=useThemeStyles(createStyles);
  useEffect(()=>{if(Platform.OS!=='web')void SystemUI.setBackgroundColorAsync(colors.background).catch(()=>{});},[colors.background]);
  const [data,setData]=useState<StoredState>(createInitialState);
  const [loaded,setLoaded]=useState(false);
  const [route,setRoute]=useState<Route>('feed');
  const [sheets,setSheets]=useState<Sheet[]>([]);
  const [toast,setToast]=useState('');
  const [searchSeed,setSearchSeed]=useState('');
  const [commentDrafts,setCommentDrafts]=useState<Record<string,CommentDraft>>({});
  const [menuExpanded,setMenuExpanded]=useState(false);
  const [menuVisible,setMenuVisible]=useState(true);
  const menuIdle=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(menuIdle.current)clearTimeout(menuIdle.current);},[]);
  const {width,height}=useWindowDimensions();
  const desktop=width>=1100;
  const wideFeed=Platform.OS==='web'&&desktop;
  const insets=useSafeAreaInsets();
  const latest=useRef(data);
  latest.current=data;
  const sheet=sheets[sheets.length-1];
  const recipeOpening=useRecipeOpening({width,height,enabled:!sheet,reducedMotion:data.preferences.reducedMotion,onBegin:recipe=>push({type:'recipe',recipe,gestureEntry:true}),onCancel:pop});
  const ownCreator=useMemo<Creator>(()=>({id:'me',...data.profile,followers:'0'}),[data.profile]);
  const recipes=useMemo(()=>[...data.posts.map(r=>({...r,author:ownCreator})),...demoRecipes].map(r=>({...r,comments:r.comments+data.comments.filter(c=>c.recipeId===r.id).length})),[data.posts,data.comments,ownCreator]);
  useEffect(()=>{let mounted=true;loadState().then(next=>{if(mounted){setData(next);setLoaded(true);}}).catch(()=>{if(mounted){setLoaded(true);setToast('No pudimos leer los datos locales. Puedes seguir usando la app.');}});return()=>{mounted=false;};},[]);
  useEffect(()=>{configureFeedback(data.preferences.reducedMotion,data.preferences.haptics);},[data.preferences]);
  useEffect(()=>{if(!loaded)return;const t=setTimeout(()=>{void saveState(data).catch(()=>setToast('El dispositivo no pudo guardar los cambios. Libera espacio y vuelve a intentarlo.'));},350);return()=>clearTimeout(t);},[data,loaded]);
  useEffect(()=>{if(!loaded)return;const sub=AppState.addEventListener('change',state=>{if(state!=='active')void saveState(latest.current).catch(()=>{});});return()=>sub.remove();},[loaded]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),3700);return()=>clearTimeout(t);},[toast]);
  useEffect(()=>{const back=BackHandler.addEventListener('hardwareBackPress',()=>{if(sheets.length){pop();return true;}if(menuExpanded){setMenuExpanded(false);return true;}if(route!=='feed'){setRoute('feed');return true;}return false;});return()=>back.remove();},[sheets.length,route,menuExpanded]);
  useEffect(()=>{if(Platform.OS!=='web')return;const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'){if(sheets.length)pop();else setMenuExpanded(false);}};globalThis.addEventListener?.('keydown',onKey as EventListener);return()=>globalThis.removeEventListener?.('keydown',onKey as EventListener);},[sheets.length]);
  function navigate(next:Route){recipeOpening.reset();Keyboard.dismiss();if(menuIdle.current)clearTimeout(menuIdle.current);setMenuExpanded(false);setMenuVisible(true);setSheets([]);setRoute(next);if(next==='explore')setSearchSeed('');}
  function beginMenuGesture(){if(menuIdle.current)clearTimeout(menuIdle.current);setMenuVisible(true);setMenuExpanded(true);}
  function onFeedScroll(){setMenuExpanded(false);setMenuVisible(false);if(menuIdle.current)clearTimeout(menuIdle.current);menuIdle.current=setTimeout(()=>setMenuVisible(true),700);}
  function push(next:Sheet){if(recipeOpening.active&&!(next.type==='recipe'&&next.gestureEntry))return;Keyboard.dismiss();setMenuExpanded(false);setSheets(old=>[...old,next]);}
  function pop(){recipeOpening.reset();Keyboard.dismiss();setSheets(old=>old.slice(0,-1));}
  function toggle(field:'liked'|'saved'|'following'|'likedComments',id:string){feedback();setData(old=>({...old,[field]:old[field].includes(id)?old[field].filter(x=>x!==id):[...old[field],id]}));}
  function saveRecipe(id:string){const exists=data.saved.includes(id);toggle('saved',id);setToast(exists?'Receta eliminada del recetario.':'Receta guardada.');}
  function follow(creator:Creator){if(creator.id==='me')return;toggle('following',creator.id);}
  function openProfile(creator:Creator){if(creator.id==='me'){navigate('profile');return;}push({type:'creator',creator});}
  function openRecipe(recipe:SocialRecipe){push({type:'recipe',recipe});}
  function updateProgress(id:string,next:CookingProgress){setData(old=>({...old,cooking:{...old.cooking,[id]:next}}));}
  async function pickImage(avatar=false):Promise<string|null>{
    try{
      const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:.85,allowsEditing:avatar,aspect:avatar?[1,1]:undefined});
      if(result.canceled||!result.assets[0])return null;
      const asset=result.assets[0];
      const image=await manipulateAsync(asset.uri,[{resize:{width:Math.min(avatar?600:1280,asset.width||1280)}}],{compress:.8,format:SaveFormat.JPEG,base64:Platform.OS==='web'});
      if(Platform.OS==='web')return image.base64?`data:image/jpeg;base64,${image.base64}`:image.uri;
      const destination=new File(Paths.document,`recepy-${avatar?'avatar':'recipe'}-${Date.now()}.jpg`);
      new File(image.uri).copy(destination);
      return destination.uri;
    }catch(error){setToast('No pudimos abrir esa foto. Prueba con otra imagen.');return null;}
  }
  async function share(recipe:SocialRecipe){const message=`${recipe.title}\n\n${recipe.rawText}\n\nCompartido desde RECEPY`;try{if(Platform.OS==='web'){await Clipboard.setStringAsync(message);setToast('Receta copiada. Comparte el antojo.');}else await Share.share({title:recipe.title,message});}catch{setToast('No pudimos compartirla. Inténtalo otra vez.');}}
  function publish(recipe:SocialRecipe){setData(old=>({...old,posts:[recipe,...old.posts]}));setRoute('profile');setSheets([]);feedback('success');setToast('Receta publicada en este dispositivo.');}
  const profileProps={profile:data.profile,recipes:recipes.filter(r=>r.author.id==='me'),isOwn:true,following:false,followingCount:data.following.length,onFollow:()=>{},onEdit:()=>push({type:'edit'}),onSettings:()=>push({type:'settings'}),onCreate:()=>navigate('create'),onRecipe:openRecipe};
  const sheetContent=sheet&&<SheetPanel key={`${sheets.length}-${sheet.type}`} kind={sheet.type==='recipe'||sheet.type==='preview'?'recipe':sheet.type==='comments'?'comments':'default'} desktop={desktop} reducedMotion={data.preferences.reducedMotion} openingOffset={sheet.type==='recipe'&&sheet.gestureEntry?recipeOpening.offset:undefined} onClose={pop}>{close=><><View style={styles.modalHeader}><IconButton name="close" label="Cerrar" size={38} onPress={close}/><Text style={styles.modalHeaderTitle}>{sheet.type==='recipe'?'Receta':sheet.type==='preview'?'Vista previa':sheet.type==='comments'?'Comentarios':sheet.type==='creator'?'Perfil':sheet.type==='edit'?'Editar perfil':sheet.type==='settings'?'Configuración':'Actividad'}</Text>{sheet.type==='recipe'?<IconButton name="chatbubble-outline" label="Ver comentarios" size={38} onPress={()=>push({type:'comments',recipe:sheet.recipe})}/>:<View style={{width:38}}/>}</View>
      {sheet.type==='recipe'&&<RecipeScreen key={sheet.recipe.id} recipe={parseRecipeText(sheet.recipe.rawText)} image={sheet.recipe.image} authorName={sheet.recipe.author.name} progress={data.cooking[sheet.recipe.id]} onProgress={p=>updateProgress(sheet.recipe.id,p)} saved={data.saved.includes(sheet.recipe.id)} onSave={()=>saveRecipe(sheet.recipe.id)}/>}
      {sheet.type==='preview'&&<RecipeScreen key={'preview-'+sheet.parsed.id} recipe={sheet.parsed} image={sheet.image} authorName={data.profile.name} progress={data.cooking['preview-'+sheet.parsed.id]} onProgress={p=>updateProgress('preview-'+sheet.parsed.id,p)} saved={false} onSave={()=>setToast('Vuelve al creador y publica la receta para guardarla.')} preview/>}
      {sheet.type==='comments'&&<CommentsScreen recipe={sheet.recipe} profile={data.profile} comments={[...initialComments,...data.comments].filter(c=>c.recipeId===sheet.recipe.id)} likedComments={data.likedComments} onLike={id=>toggle('likedComments',id)} onProfile={openProfile} draft={commentDrafts[sheet.recipe.id]??{text:''}} onDraftChange={draft=>setCommentDrafts(old=>({...old,[sheet.recipe.id]:draft}))} onSubmit={(text,parentId)=>setData(old=>({...old,comments:[...old.comments,{id:`comment-${Date.now()}`,recipeId:sheet.recipe.id,author:old.profile.name,authorId:'me',authorHandle:old.profile.handle,avatar:old.profile.avatar,text,time:'Ahora',...(parentId?{parentId}:{})}]}))}/>}
      {sheet.type==='creator'&&<ProfileScreen profile={sheet.creator} recipes={recipes} isOwn={false} following={data.following.includes(sheet.creator.id)} followingCount={0} onFollow={()=>follow(sheet.creator)} onEdit={()=>{}} onSettings={()=>{}} onCreate={()=>navigate('create')} onRecipe={openRecipe}/>}
      {sheet.type==='edit'&&<EditProfileScreen profile={data.profile} onPickAvatar={()=>pickImage(true)} onSave={profile=>{setData(old=>({...old,profile}));pop();setToast('Perfil actualizado.');}}/>}
      {sheet.type==='settings'&&<SettingsScreen preferences={data.preferences} onChange={patch=>setData(old=>({...old,preferences:{...old.preferences,...patch}}))}/>}
      {sheet.type==='activity'&&<EmptyState icon="notifications-outline" title="Sin actividad" body="Tus novedades aparecerán aquí."/>}
      {!!toast&&<Toast message={toast} bottom={18}/>}
      </>}</SheetPanel>;
  if(!loaded)return <SafeAreaView style={styles.loading}><Image source={require('./assets/recepy-logo.png')} style={{width:180,height:65}} resizeMode="contain"/><ActivityIndicator color={colors.red} style={{marginTop:30}}/></SafeAreaView>;
  return <View style={styles.root}>
    <StatusBar style={route==='feed'&&!wideFeed&&!sheet?'light':isDark?'light':'dark'}/>
    <View pointerEvents={sheet?"none":"box-none"} aria-hidden={!!sheet} {...(Platform.OS==='web'?{inert:!!sheet&&!recipeOpening.active}:{})} accessibilityElementsHidden={!!sheet} importantForAccessibility={sheet?'no-hide-descendants':'auto'} style={[styles.header,route==='feed'&&!wideFeed?styles.headerOverlay:styles.headerSolid,{paddingTop:insets.top,height:insets.top+(route==='feed'&&!wideFeed?112:64)}]}>
      {route==='feed'&&!wideFeed&&<LinearGradient pointerEvents="none" colors={['#000000','#000000c0','#00000000']} locations={[0,.48,1]} style={StyleSheet.absoluteFill}/>}
      <Pressable accessibilityRole="button" accessibilityLabel="RECEPY, ir al inicio" onPress={()=>navigate('feed')} style={styles.centerLogo}><Image source={require('./assets/recepy-logo.png')} style={styles.logo} resizeMode="contain"/></Pressable>
    </View>
    <View style={styles.body} aria-hidden={!!sheet} {...(Platform.OS==='web'?{inert:!!sheet&&!recipeOpening.active}:{})} accessibilityElementsHidden={!!sheet} importantForAccessibility={sheet?'no-hide-descendants':'auto'}>
      {route==='feed'&&<FeedScreen recipes={recipes} liked={data.liked} saved={data.saved} following={data.following} onLike={id=>toggle('liked',id)} onSave={saveRecipe} onRecipe={openRecipe} recipeGesture={recipeOpening.gesture} onComments={recipe=>push({type:'comments',recipe})} onProfile={openProfile} onFollow={follow} onShare={share} autoplay={data.preferences.autoplay} isFocused={!sheet} ownHandle={data.profile.handle} onScrollStart={onFeedScroll} renderRecipe={recipe=><><View style={styles.inlineHeader}><Text style={styles.modalHeaderTitle}>Receta</Text><IconButton name="chatbubble-outline" label="Ver comentarios" size={36} onPress={()=>push({type:'comments',recipe})}/></View><RecipeScreen key={recipe.id} recipe={parseRecipeText(recipe.rawText)} image={recipe.image} authorName={recipe.author.name} progress={data.cooking[recipe.id]} onProgress={p=>updateProgress(recipe.id,p)} saved={data.saved.includes(recipe.id)} onSave={()=>saveRecipe(recipe.id)}/></>}/>}
      {route==='explore'&&<ExploreScreen key={searchSeed} recipes={recipes} onRecipe={openRecipe} onProfile={openProfile} initialQuery={searchSeed}/>}
      {route==='create'&&<ComposeScreen profile={data.profile} onPickImage={()=>pickImage(false)} onPreview={(parsed,image)=>push({type:'preview',parsed,image})} onPublish={publish}/>}
      {route==='profile'&&<ProfileScreen {...profileProps}/>}
      {route==='saved'&&<ScrollView contentContainerStyle={styles.savedPage}><Text accessibilityRole="header" style={styles.pageTitle}>Recetario</Text>{data.saved.length?<RecipeGrid recipes={recipes.filter(r=>data.saved.includes(r.id))} onRecipe={openRecipe} onProfile={openProfile}/>:<EmptyState icon="bookmark-outline" title="Aún no hay recetas guardadas" body="Guarda tus favoritas desde el feed." action="Explorar recetas" onAction={()=>navigate('feed')}/>}</ScrollView>}
    </View>
    {!sheet&&<FloatingMenu route={route} expanded={menuExpanded} hidden={route==='feed'&&!menuVisible} bottom={Math.max(insets.bottom,12)+8} reducedMotion={data.preferences.reducedMotion} onToggle={()=>{feedback();if(menuIdle.current)clearTimeout(menuIdle.current);setMenuVisible(true);setMenuExpanded(v=>!v);}} onNavigate={navigate} onGestureOpen={beginMenuGesture} onGestureClose={()=>setMenuExpanded(false)}/>}
    {/* Keep the feed responder alive during entry, and retain one recipe instance. */}
    {sheet?.type==='recipe'&&<View testID="recipe-layer" role="dialog" aria-label="Receta" aria-modal={!recipeOpening.active} aria-hidden={recipeOpening.active} pointerEvents={recipeOpening.active?'none':'auto'} accessibilityViewIsModal={!recipeOpening.active} accessibilityElementsHidden={recipeOpening.active} importantForAccessibility={recipeOpening.active?'no-hide-descendants':'auto'} style={[StyleSheet.absoluteFill,{zIndex:50}]}>{sheetContent}</View>}
    <Modal visible={!!sheet&&sheet.type!=='recipe'} transparent animationType="none" statusBarTranslucent onRequestClose={pop} presentationStyle="overFullScreen">
      {sheet?.type!=='recipe'&&sheetContent}
    </Modal>
    {!!toast&&!sheet&&<Toast message={toast} bottom={desktop?28:Math.max(insets.bottom,7)+78}/>}
  </View>;
}

function Toast({message,bottom}:{message:string;bottom:number}){const{colors}=useTheme();const styles=useThemeStyles(createStyles);return <View style={[styles.toast,{bottom}]} accessibilityRole="alert" accessibilityLiveRegion="polite"><Icon name="checkmark-circle" size={18} color={colors.green}/><Text style={styles.toastText}>{message}</Text></View>;}

const createStyles=(colors:ThemeColors,isDark:boolean)=>StyleSheet.create({
  root:{flex:1,backgroundColor:colors.background,overflow:'hidden'},loading:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:colors.background},
  header:{alignItems:'center',zIndex:20},headerOverlay:{position:'absolute',top:0,left:0,right:0},headerSolid:{backgroundColor:colors.background},centerLogo:{width:160,height:64,alignItems:'center',justifyContent:'center'},logo:{width:133,height:48},body:{flex:1,minHeight:0},inlineHeader:{height:50,paddingHorizontal:22,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:colors.border},
  savedPage:{padding:23,paddingTop:26,paddingBottom:120,maxWidth:1120,alignSelf:'center',width:'100%'},pageTitle:{fontSize:28,letterSpacing:-.8,color:colors.text,fontWeight:'600',marginBottom:28},
  modalHeader:{height:61,paddingHorizontal:19,flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border,backgroundColor:colors.background},modalHeaderTitle:{fontSize:13,fontWeight:'500',color:colors.muted},
  toast:{position:'absolute',left:20,right:20,maxWidth:490,alignSelf:'center',marginHorizontal:'auto',zIndex:1000,backgroundColor:colors.glass,borderWidth:1,borderColor:colors.border,borderRadius:16,paddingHorizontal:16,paddingVertical:14,flexDirection:'row',alignItems:'center',gap:10},toastText:{flex:1,fontSize:12,lineHeight:18,color:colors.text},

});
