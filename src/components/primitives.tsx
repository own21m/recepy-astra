import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View, StyleSheet, Platform, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { darkColors, useTheme, useThemeStyles, type ThemeColors } from '../theme';

let motionEnabled=true;
let hapticsEnabled=true;
export function configureFeedback(reducedMotion:boolean,haptics:boolean){motionEnabled=!reducedMotion;hapticsEnabled=haptics;}
export function feedback(kind:'light'|'success'='light'){
  if(Platform.OS==='web'||!hapticsEnabled)return;
  void(kind==='success'?Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success):Haptics.selectionAsync()).catch(()=>{});
}
export type IconName=React.ComponentProps<typeof Ionicons>['name'];
export function Icon({name,size=22,color}:{name:IconName;size?:number;color?:string}){
  const{colors}=useTheme();return <Ionicons name={name} size={size} color={color??colors.text}/>;
}
export function SpringPress({children,onPress,style,label,hint,disabled=false}:{children:React.ReactNode;onPress:()=>void;style?:StyleProp<ViewStyle>;label?:string;hint?:string;disabled?:boolean}){
  const scale=useRef(new Animated.Value(1)).current;
  const animate=(value:number)=>{if(motionEnabled)Animated.spring(scale,{toValue:value,useNativeDriver:Platform.OS!=='web',speed:35,bounciness:9}).start();};
  return <Animated.View style={[style,{transform:[{scale}]}]}><Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint} accessibilityState={{disabled}} disabled={disabled} onPress={()=>{feedback();onPress();}} onPressIn={()=>animate(.96)} onPressOut={()=>animate(1)} style={{opacity:disabled?.38:1}}>{children}</Pressable></Animated.View>;
}
export function PuffyButton({title,onPress,icon,small=false,disabled=false,style,material='solid',arrowDirection='right',showArrow=!small,hint}:{title:string;onPress:()=>void;icon?:IconName;small?:boolean;disabled?:boolean;style?:StyleProp<ViewStyle>;material?:'solid'|'glass';arrowDirection?:'left'|'right';showArrow?:boolean;hint?:string}){
  const{colors}=useTheme();const styles=useThemeStyles(createStyles);
  const content=<>{icon&&<Icon name={icon} size={small?18:21} color={colors.onPrimary}/>}<Text style={styles.actionText}>{title}</Text>{showArrow&&<Icon name={arrowDirection==='left'?'arrow-back':'arrow-forward'} size={19} color={colors.onPrimary}/>}</>;
  const buttonStyle=[styles.actionButton,small&&styles.actionSmall];
  return <SpringPress onPress={onPress} disabled={disabled} label={title} hint={hint} style={[styles.actionShell,style]}>{material==='glass'?<Glass appearance="dark" tint="red" style={[...buttonStyle,styles.actionGlass]}>{content}</Glass>:<View style={buttonStyle}>{content}</View>}</SpringPress>;
}
export function IconButton({name,label,onPress,active=false,size=42,appearance='auto'}:{name:IconName;label:string;onPress:()=>void;active?:boolean;size?:number;appearance?:'auto'|'dark'}){
  const theme=useTheme();const colors=appearance==='dark'?darkColors:theme.colors;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={()=>{feedback();onPress();}} hitSlop={6} style={({pressed})=>[{width:size,height:size,borderRadius:size/2,alignItems:'center',justifyContent:'center',backgroundColor:active?colors.redTint:colors.surface,borderWidth:1,borderColor:active?colors.red:colors.border,opacity:pressed?.65:1}]}><Icon name={name} size={size>40?20:18} color={active?colors.red:colors.text}/></Pressable>;
}
export function Glass({children,style,appearance='auto',tint}:{children:React.ReactNode;style?:StyleProp<ViewStyle>;appearance?:'auto'|'dark';tint?:'red'}){
  const theme=useTheme();const isDark=appearance==='dark'||theme.isDark;const colors=appearance==='dark'?darkColors:theme.colors;
  let available=false;try{available=Platform.OS==='ios'&&isGlassEffectAPIAvailable()&&isLiquidGlassAvailable();}catch{}
  const red=tint==='red';
  const blur=red?'blur(26px) saturate(190%)':'blur(24px) saturate(160%)';
  const webBlur=Platform.OS==='web'?{backdropFilter:blur,WebkitBackdropFilter:blur} as ViewStyle:undefined;
  return <View style={[material.glass,{borderColor:red?'#ffad9d90':colors.glassBorder},style]}>{available?<GlassView pointerEvents="none" glassEffectStyle="clear" tintColor={red?'#ef3524c4':isDark?'#16161660':'#eadcc6a0'} style={StyleSheet.absoluteFill}/>:Platform.OS==='ios'?<><BlurView pointerEvents="none" intensity={40} tint={isDark?'dark':'light'} style={StyleSheet.absoluteFill}/>{red&&<View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'rgba(239,53,36,0.79)'}]}/>}</>:<View pointerEvents="none" style={[StyleSheet.absoluteFill,webBlur,{backgroundColor:red?'rgba(239,53,36,0.79)':colors.glass}]}/>}<View pointerEvents="none" style={[material.glassRim,{backgroundColor:red?'#ffd5ccbb':isDark?'#ffffff2e':'#fff6e570'}]}/>{children}</View>;
}
export function Eyebrow({children}:{children:React.ReactNode}){const styles=useThemeStyles(createStyles);return <Text style={styles.eyebrow}>{children}</Text>;}
export function EmptyState({icon,title,body,action,onAction}:{icon:IconName;title:string;body:string;action?:string;onAction?:()=>void}){
  const{colors}=useTheme();const styles=useThemeStyles(createStyles);
  return <View style={styles.empty}><View style={styles.emptyIcon}><Icon name={icon} size={28} color={colors.muted}/></View><Text style={styles.emptyTitle}>{title}</Text>{body?<Text style={styles.emptyBody}>{body}</Text>:null}{action&&onAction&&<PuffyButton small title={action} onPress={onAction} style={{marginTop:22}}/>}</View>;
}
export function FadeIn({children,style}:{children:React.ReactNode;style?:StyleProp<ViewStyle>}){const opacity=useRef(new Animated.Value(motionEnabled?0:1)).current;useEffect(()=>{Animated.timing(opacity,{toValue:1,duration:motionEnabled?250:0,useNativeDriver:Platform.OS!=='web'}).start();},[]);return <Animated.View style={[style,{opacity}]}>{children}</Animated.View>;}
const createCommon=(colors:ThemeColors)=>StyleSheet.create({title:{fontSize:31,fontWeight:'700',letterSpacing:-1.3,color:colors.text},body:{fontSize:13,lineHeight:21,color:colors.muted},input:{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:16,color:colors.text,padding:16,fontSize:15},label:{color:colors.muted,fontSize:11,fontWeight:'600',marginBottom:10},row:{flexDirection:'row',alignItems:'center'},section:{padding:22},divider:{height:1,backgroundColor:colors.border},pill:{borderRadius:99,paddingHorizontal:13,paddingVertical:9,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border}});
export const useCommonStyles=()=>useThemeStyles(createCommon);
const createStyles=(colors:ThemeColors,isDark:boolean)=>StyleSheet.create({actionShell:{borderRadius:999},actionButton:{paddingHorizontal:20,minHeight:57,borderRadius:999,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:11,backgroundColor:isDark?colors.redDark:colors.red,borderWidth:1,borderColor:isDark?colors.redDark:colors.red},actionGlass:{backgroundColor:'transparent',borderColor:'#ffbdad66'},actionSmall:{minHeight:46,paddingHorizontal:17,borderRadius:999,gap:8},actionText:{fontSize:14,fontWeight:'600',color:colors.onPrimary,flexShrink:1},eyebrow:{fontSize:9,fontWeight:'600',letterSpacing:1.8,color:colors.muted},empty:{paddingHorizontal:30,paddingVertical:70,alignItems:'center'},emptyIcon:{width:68,height:68,borderRadius:34,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center',marginBottom:18,borderWidth:1,borderColor:colors.border},emptyTitle:{fontSize:24,fontWeight:'700',letterSpacing:-.8,color:colors.text,textAlign:'center'},emptyBody:{fontSize:13,lineHeight:21,color:colors.muted,textAlign:'center',maxWidth:310,marginTop:12}});
const material=StyleSheet.create({glass:{overflow:'hidden',borderRadius:20,borderWidth:1},glassRim:{position:'absolute',top:0,left:8,right:8,height:1}});
