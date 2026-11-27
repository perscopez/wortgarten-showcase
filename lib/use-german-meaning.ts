'use client';
import {useEffect,useState} from 'react';
import {findGermanMeaning,maskWord,meaningKey} from './german-meaning';
/** Words already explained online on this device; keeps cards readable offline after the first look. */
export const GERMAN_MEANING_CACHE_KEY='wortgarten-german-meanings-v1';
let bundled:Promise<Record<string,string>>|null=null;
let bundledWords:Record<string,string>|null=null;
const misses=new Set<string>();
function loadBundled(){return bundled??=import('./german-meanings.json').then(m=>bundledWords=(m.default as {words:Record<string,string>}).words).catch(()=>{bundled=null;return {} as Record<string,string>;});}
function readCache():Record<string,string>{try{const raw=JSON.parse(localStorage.getItem(GERMAN_MEANING_CACHE_KEY)||'{}');return raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};}catch{return {};}}
function writeCache(word:string,meaning:string){try{const cache=readCache();cache[word]=meaning;const keys=Object.keys(cache);for(const k of keys.slice(0,Math.max(0,keys.length-1500)))delete cache[k];localStorage.setItem(GERMAN_MEANING_CACHE_KEY,JSON.stringify(cache));}catch{/* storage full or blocked */}}
export async function resolveGermanMeaning(word:string,signal?:AbortSignal):Promise<string>{
 const key=meaningKey(word);if(!key)return '';
 const local=findGermanMeaning(await loadBundled(),key);if(local)return local;
 const cached=readCache()[key];if(typeof cached==='string'&&cached)return cached;
 if(misses.has(key)||typeof fetch==='undefined')return '';
 try{
  const r=await fetch('/api/meaning-de?word='+encodeURIComponent(key),{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(10000)]):AbortSignal.timeout(10000)});
  if(!r.ok){if(r.status===404)misses.add(key);return '';}
  const data:unknown=await r.json();const meaning=typeof (data as {meaning?:unknown})?.meaning==='string'?(data as {meaning:string}).meaning.trim():'';
  if(meaning)writeCache(key,meaning);else misses.add(key);
  return meaning;
 }catch{return '';}
}
/** German explanation for a word: '' while loading or when none is known. */
export function useGermanMeaning(word:string,enabled=true){
 const key=meaningKey(word);
 const [state,setState]=useState<{key:string;meaning:string;done:boolean}>({key:'',meaning:'',done:false});
 useEffect(()=>{
  if(!enabled||!key)return;
  const ctrl=new AbortController();
  resolveGermanMeaning(key,ctrl.signal).then(meaning=>{if(!ctrl.signal.aborted)setState({key,meaning,done:true});});
  return()=>ctrl.abort();
 },[key,enabled]);
 const current=state.key===key;
 return {meaning:current?state.meaning:'',loading:enabled&&!!key&&!(current&&state.done)};
}
/** The bundled German explanations (null while loading), for screens that need many words at once. */
export function useBundledGermanMeanings(enabled=true){
 const [words,setWords]=useState<Record<string,string>|null>(bundledWords);
 useEffect(()=>{if(!enabled)return;let live=true;loadBundled().then(w=>{if(live)setWords(w);});return()=>{live=false;};},[enabled]);
 return enabled?words:null;
}
/** A short German explanation for choices and prompts: the first sense, with the word itself hidden. */
export function shortGermanMeaning(words:Record<string,string>,word:string):string{
 const full=findGermanMeaning(words,word);if(!full)return '';
 const first=full.split(/;\s*/)[0].trim();
 return maskWord(first.length>140?first.slice(0,137).replace(/\s+\S*$/,'')+' …':first,word);
}
