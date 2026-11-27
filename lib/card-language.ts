'use client';
import {useSyncExternalStore} from 'react';
/**
 * Language of the word cards. German (monolingual) is the default; Turkish is an opt-in.
 * The choice is a per-device preference kept in localStorage.
 */
export type CardLanguage='de'|'tr';
export const CARD_LANGUAGE_KEY='wortgarten-card-language';
const EVENT='wortgarten-card-language';
export function normalizeCardLanguage(value:unknown):CardLanguage{return value==='tr'?'tr':'de';}
export function readCardLanguage():CardLanguage{try{return normalizeCardLanguage(localStorage.getItem(CARD_LANGUAGE_KEY));}catch{return 'de';}}
export function writeCardLanguage(lang:CardLanguage){
 try{localStorage.setItem(CARD_LANGUAGE_KEY,lang);}catch{/* private mode: keeps working for this page only */}
 memory=lang;
 if(typeof window!=='undefined')window.dispatchEvent(new Event(EVENT));
}
let memory:CardLanguage|null=null;
function snapshot():CardLanguage{return memory??(memory=readCardLanguage());}
function subscribe(change:()=>void){
 const onStorage=(e:StorageEvent)=>{if(e.key===CARD_LANGUAGE_KEY){memory=normalizeCardLanguage(e.newValue);change();}};
 window.addEventListener(EVENT,change);window.addEventListener('storage',onStorage);
 return()=>{window.removeEventListener(EVENT,change);window.removeEventListener('storage',onStorage);};
}
// Server HTML is always German; without a window (server, tests) the environment's storage decides, so rendering stays deterministic.
const serverSnapshot=():CardLanguage=>typeof window==='undefined'?snapshot():'de';
export function useCardLanguage():CardLanguage{return useSyncExternalStore(subscribe,snapshot,serverSnapshot);}
/** Picks the German or Turkish text for the current card language. */
export function pick<T>(lang:CardLanguage,de:T,tr:T):T{return lang==='de'?de:tr;}
/** Saved inflection tables carry Turkish titles; German cards show them in German. */
const TABLE_TITLES:[RegExp,string][]=[[/^Fiil · /,'Verb · '],[/^İsim · dört hâl/,'Nomen · vier Fälle'],[/^Sıfat · karşılaştırma/,'Adjektiv · Steigerung'],[/temel biçimler/,'Grundformen'],[/ek biçimler \(kaynakta varsa\)/,'weitere Formen (falls belegt)']];
export function tableTitle(lang:CardLanguage,title:string){if(lang!=='de'||!title)return title;let out=title;for(const [from,to] of TABLE_TITLES)out=out.replace(from,to);return out;}
const KINDS:Record<string,string>={'İsim':'Nomen','Fiil':'Verb','Sıfat':'Adjektiv','Zarf':'Adverb','Edat':'Präposition','Kalıp':'Wendung','Birleşik biçim':'Verschmelzung','Bağlaç':'Konjunktion','Zamir':'Pronomen','Artikel':'Artikel','Sayı':'Zahlwort'};
/** Word-type labels from compact card facts ("İsim", "Fiil" …) in the card language. */
export function kindLabel(lang:CardLanguage,label:string){if(lang!=='de'||!label)return label;return label.split(' · ').map(part=>KINDS[part]??part).join(' · ');}
