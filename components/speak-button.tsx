'use client';
import {useEffect,useRef,useState} from 'react';
import {readAloud,type SpokenLine} from '../lib/read-aloud';
import {useCardLanguage} from '../lib/card-language';

/** Reads German (and optionally its Turkish meaning) aloud. Hidden when the browser cannot speak. */
export default function SpeakButton({de,tr,label,className='text-button speak-button',title,iconOnly=false}:{de:string;tr?:string;label?:string;className?:string;title?:string;iconOnly?:boolean}){
 const lang=useCardLanguage();const text=label||(lang==='de'?'Anhören':'Dinle'),stopText=lang==='de'?'Stopp':'Durdur';
 const stop=useRef<(()=>void)|null>(null);
 const [playing,setPlaying]=useState(false);
 const [supported,setSupported]=useState(true);
 useEffect(()=>{setSupported(typeof window!=='undefined'&&'speechSynthesis' in window&&typeof SpeechSynthesisUtterance!=='undefined');return()=>stop.current?.();},[]);
 if(!supported||!de.trim())return null;
 function toggle(){
  if(playing){stop.current?.();stop.current=null;setPlaying(false);return;}
  const lines:SpokenLine[]=[{text:de,lang:'de-DE'},...(tr?.trim()?[{text:tr,lang:'tr-TR' as const}]:[])];
  try{setPlaying(true);stop.current=readAloud(lines,()=>{stop.current=null;setPlaying(false);});}catch{setPlaying(false);}
 }
 return <button type="button" data-ui className={className} title={title} onClick={toggle} aria-pressed={playing} aria-label={playing?stopText:text}>{iconOnly?(playing?'⏹':'🔊'):playing?'⏹ '+stopText:'🔊 '+text}</button>;
}
