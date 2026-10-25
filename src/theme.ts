import React, { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { Platform, useColorScheme } from 'react-native';

export type ThemeColors = {
  background:string;surface:string;raised:string;border:string;text:string;muted:string;
  red:string;redDark:string;green:string;overlay:string;glass:string;glassBorder:string;redTint:string;onPrimary:string;
};
export const darkColors:ThemeColors={
  background:'#000000',surface:'#090909',raised:'#151515',border:'#242424',
  text:'#f7f5f0',muted:'#8b8b87',red:'#f04432',redDark:'#d23728',green:'#c1d0a4',
  overlay:'rgba(0,0,0,0.72)',glass:'rgba(23,23,23,0.78)',glassBorder:'rgba(255,255,255,0.17)',
  redTint:'rgba(240,68,50,0.13)',onPrimary:'#fff8ee',
};
export const lightColors:ThemeColors={
  background:'#eee5d5',surface:'#f5eddf',raised:'#e5dac8',border:'#d6c7b1',
  text:'#2a241e',muted:'#6f6253',red:'#bf3024',redDark:'#a9241b',green:'#52643a',
  overlay:'rgba(49,37,24,0.38)',glass:'rgba(245,235,219,0.82)',glassBorder:'rgba(82,60,34,0.19)',
  redTint:'rgba(201,52,38,0.09)',onPrimary:'#fff8ee',
};
// Media overlays stay dark to preserve contrast over food photography and video.
export const colors=darkColors;
type ThemeValue={colors:ThemeColors;isDark:boolean;scheme:'light'|'dark'};
const ThemeContext=createContext<ThemeValue>({colors:darkColors,isDark:true,scheme:'dark'});
export function ThemeProvider({children}:{children:ReactNode}){
  const systemScheme=useColorScheme();
  const isDark=systemScheme==='dark';
  const value=useMemo<ThemeValue>(()=>({colors:isDark?darkColors:lightColors,isDark,scheme:isDark?'dark':'light'}),[isDark]);
  useEffect(()=>{
    if(Platform.OS!=='web'||typeof document==='undefined')return;
    document.documentElement.style.colorScheme=value.scheme;
    document.documentElement.style.backgroundColor=value.colors.background;
    document.body.style.backgroundColor=value.colors.background;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',value.colors.background);
  },[value]);
  return React.createElement(ThemeContext.Provider,{value},children);
}
export const useTheme=()=>useContext(ThemeContext);
export function useThemeStyles<T>(factory:(colors:ThemeColors,isDark:boolean)=>T):T{
  const {colors,isDark}=useTheme();
  return useMemo(()=>factory(colors,isDark),[factory,colors,isDark]);
}
export const spacing={xxs:4,xs:8,sm:12,md:16,lg:24,xl:32,xxl:48} as const;
export const radius={xs:8,sm:12,md:18,lg:24,xl:32,pill:999} as const;
