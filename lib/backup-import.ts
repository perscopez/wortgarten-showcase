import {validReviewState,type ReviewState} from './review-scheduler';
import {validQualityFlag,type QualityFlag} from './quality-flag';
import {canonicalCardWord} from './card-duplicates';
import {safeInflections} from './saved-inflections';
import {safeRection} from './saved-rection';
import type {Inflections} from './inflections';
import type {RectionData} from './rection';
import {reviewedArtByIdentity} from './reviewed-art';
import {mergeCardVersions,safeDuplicate,strongestSchedule} from './card-merge';
import {parsePersonalPatterns,type PersonalPattern} from './pattern-practice';
export type ImportPhoto={url:string;source:string;title:string;author:string;license:string;licenseUrl:string;kind?:'photo'|'illustration'|'image';assetId?:string;archive?:'openmoji'|'twemoji'|'wortgarten'|'wikimedia';attribution?:string;explanationTR?:string;match?:'curated'|'candidate';confidence?:string;conceptId?:string};
export type ImportCard={patterns?:PersonalPattern[];id:string;word:string;article:string;plural:string;meaning:string;example:string;translation:string;note?:string;photo?:ImportPhoto;source?:string;due:number;interval:number;reviews:number;created:number;partOfSpeech?:string;articleAmbiguous?:boolean;inflections?:Inflections;rection?:RectionData;informationCheckedAt?:number;reviewState?:ReviewState;qualityFlag?:QualityFlag};
export type CardBackup={cards:ImportCard[];learningProgress?:unknown;extraLearning?:unknown;exportedAt?:string;raw:unknown};
export type ImportChoice='detailed'|'phone'|'computer'|'separate';
export type ScheduleChoice='more-reviewed'|'phone'|'computer';
export type SkillChoice='more-attempts'|'phone'|'computer';
export type ImportChoices={content:Record<number,ImportChoice>;targets:Record<number,string>;schedule:ScheduleChoice;skills:SkillChoice};
export const IMPORT_FIELDS=['word','article','meaning','plural','example','translation','note','partOfSpeech','photo','inflections','rection','articleAmbiguous','qualityFlag','patterns'] as const;
const string=(v:unknown,max=100000)=>typeof v==='string'&&v.length<=max;
const number=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
function kind(c:ImportCard){return c.partOfSpeech&&c.partOfSpeech!=='unknown'?c.partOfSpeech:['der','die','das'].includes(c.article)?'noun':'';}
function trustedPhoto(value:any):ImportPhoto|undefined{
 if(!value||typeof value!=='object')return;
 if(value.kind==='illustration'||value.assetId){
  const trusted=typeof value.assetId==='string'&&typeof value.url==='string'?reviewedArtByIdentity(value.assetId,value.url):undefined;
  if(!trusted)return;
  return{...trusted,match:'curated',confidence:'curated'};
 }
 // Backward compatibility is limited to existing Wikimedia-hosted photographs.
 if(typeof value.url!=='string'||!/^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(value.url))return;
 return{url:value.url,source:typeof value.source==='string'&&/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(value.source)?value.source:'',title:string(value.title)?value.title:'',author:string(value.author)?value.author:'',license:string(value.license)?value.license:'',licenseUrl:string(value.licenseUrl)&&/^https?:\/\//.test(value.licenseUrl)?value.licenseUrl:'',kind:'image',match:value.match==='curated'?'curated':'candidate',confidence:value.confidence==='curated'?'curated':'candidate',...(typeof value.conceptId==='string'?{conceptId:value.conceptId}:{})};
}
export function backupCardsFingerprint(cards:ImportCard[]){return JSON.stringify(cards);}
export function parseCardBackup(input:unknown,newId:()=>string=()=>crypto.randomUUID()):CardBackup{
 const source=input as any,rows=Array.isArray(input)?input:source?.cards;
 if(!Array.isArray(rows)||rows.length>5000)throw Error('Yedekte en fazla 5000 kelime olmalı.');
 const ids=new Set<string>();const cards:ImportCard[]=rows.map(c=>{if(!c||!string(c.word,199)||!c.word.trim()||!string(c.meaning,4999)||!c.meaning.trim())throw Error('Yedekte geçersiz kelime/anlam var.');for(const k of ['article','plural','example','translation','note','partOfSpeech'])if(c[k]!==undefined&&!string(c[k]))throw Error('Yedekte geçersiz metin alanı: '+k);for(const k of ['due','interval','reviews','created'])if(c[k]!==undefined&&!number(c[k]))throw Error('Yedekte geçersiz tekrar bilgisi.');if(c.reviewState!==undefined&&!validReviewState(c.reviewState))throw Error('Yedekte geçersiz tekrar geçmişi.');if(c.qualityFlag!==undefined&&!validQualityFlag(c.qualityFlag))throw Error('Yedekte geçersiz kontrol notu.');const id=string(c.id,200)&&c.id&&!/[\u0000-\u001f\u007f]/.test(c.id)&&!c.id.includes('__proto__')?c.id:newId();if(ids.has(id))throw Error('Yedekte aynı kart kimliği birden fazla kez var; kaynak dosya korunuyor.');ids.add(id);const photo=trustedPhoto(c.photo);
 return{id,...(c.patterns===undefined?{}:{patterns:parsePersonalPatterns(c.patterns)}),word:c.word,meaning:c.meaning,article:c.article||'',plural:c.plural||'',example:c.example||'',translation:c.translation||'',...(c.note!==undefined?{note:c.note}:{}),partOfSpeech:c.partOfSpeech,articleAmbiguous:!!c.articleAmbiguous,inflections:safeInflections(c.inflections),rection:safeRection(c.rection),photo,source:typeof c.source==='string'&&/^https:\/\/de\.wiktionary\.org\//.test(c.source)?c.source:'',due:c.due??0,interval:c.interval??0,reviews:c.reviews??0,created:c.created??Date.now(),informationCheckedAt:number(c.informationCheckedAt)?c.informationCheckedAt:undefined,...(c.reviewState?{reviewState:structuredClone(c.reviewState)}:{}),...(c.qualityFlag?{qualityFlag:structuredClone(c.qualityFlag)}:{})};});
 return{cards,learningProgress:Array.isArray(input)?undefined:source.learningProgress,extraLearning:Array.isArray(input)?undefined:source.extraLearning,exportedAt:typeof source?.exportedAt==='string'?source.exportedAt:undefined,raw:input};
}
export function importCandidates(cards:ImportCard[],incoming:ImportCard){const matches=cards.filter(c=>{if(canonicalCardWord(c)!==canonicalCardWord(incoming))return false;const a=kind(c),b=kind(incoming);if(a&&b&&a!==b)return false;if(c.article&&incoming.article&&c.article!==incoming.article)return false;return true;});const sameId=matches.filter(c=>c.id===incoming.id);return sameId.length?sameId:matches;}
export function importMatchAmbiguous(candidates:ImportCard[],incoming:ImportCard){return candidates.length>1||candidates.some(c=>c.id!==incoming.id&&(!kind(c)||!kind(incoming)||c.article!==incoming.article||!safeDuplicate(c,incoming)));}
export function changedImportFields(pc:ImportCard,phone:ImportCard){return [...IMPORT_FIELDS.filter(k=>JSON.stringify(pc[k]??null)!==JSON.stringify(phone[k]??null)),...(['due','interval','reviews'] as const).filter(k=>pc[k]!==phone[k]),...(JSON.stringify(pc.reviewState??null)!==JSON.stringify(phone.reviewState??null)?['reviewState']:[])];}
export function buildImportRows(current:ImportCard[],incoming:ImportCard[]){return incoming.map((phone,index)=>{const candidates=importCandidates(current,phone),ambiguous=importMatchAmbiguous(candidates,phone);return{index,phone,candidates,ambiguous,fields:candidates.length===1?changedImportFields(candidates[0],phone):[],status:!candidates.length?'new':ambiguous?'ambiguous':changedImportFields(candidates[0],phone).length?'conflict':'same'};});}
export function defaultImportChoices(current:ImportCard[],incoming:ImportCard[]):ImportChoices{const rows=buildImportRows(current,incoming);return{content:Object.fromEntries(rows.map(r=>[r.index,r.ambiguous?'separate':'detailed'])),targets:Object.fromEntries(rows.filter(r=>r.candidates.length).map(r=>[r.index,r.candidates[0].id])),schedule:'more-reviewed',skills:'more-attempts'};}
export function mergeImportCard(pc:ImportCard,phone:ImportCard,content:ImportChoice,schedule:ScheduleChoice):ImportCard{let result=content==='detailed'?mergeCardVersions(pc,phone):content==='computer'?{...pc}:{...pc,...phone,id:pc.id,...(phone.note===undefined?{note:pc.note}:{}),...(phone.qualityFlag===undefined?{qualityFlag:pc.qualityFlag}:{})};const source=schedule==='phone'?phone:schedule==='computer'?pc:strongestSchedule(pc,phone);result={...result,id:pc.id,due:source.due,interval:source.interval,reviews:source.reviews,reviewState:source.reviewState,created:Math.min(pc.created,phone.created)};return result;}
export function applyCardImport(current:ImportCard[],incoming:ImportCard[],choices:ImportChoices,newId:()=>string=()=>crypto.randomUUID()){
 const initialIds=new Set(current.map(c=>c.id));const cards=current.map(c=>({...c})),idMap:Record<string,string>=Object.create(null);let added=0,matched=0;
 for(const[index,phone]of incoming.entries()){
  const initialCandidates=importCandidates(current,phone);
  const candidates=importCandidates(cards,phone).filter(c=>initialIds.has(c.id));
  const choice=choices.content[index]||'detailed',preferred=choices.targets[index];
  const earlierMatch=choice==='detailed'&&!candidates.length
   ?cards.filter(c=>!initialIds.has(c.id)&&safeDuplicate(c,phone))
   :[];
  const target=preferred?(candidates.find(c=>c.id===preferred)||(initialCandidates.some(c=>c.id===preferred)?cards.find(c=>c.id===preferred):undefined))
   :candidates.length===1?candidates[0]
   :earlierMatch.length===1?earlierMatch[0]:undefined;
  if(choice==='separate'||!target){if((candidates.length||initialCandidates.length)&&choice!=='separate')throw Error('Belirsiz kayıt için hedef kart seç.');let id=phone.id;if(cards.some(c=>c.id===id))id=newId();if(cards.some(c=>c.id===id))throw Error('Yeni kimlik üretilemedi.');cards.push({...phone,id});idMap[phone.id]=id;added++;}
  else{const i=cards.findIndex(c=>c.id===target!.id);cards[i]=mergeImportCard(target,phone,choice,choices.schedule);idMap[phone.id]=target.id;matched++;}
 }
 return{cards,idMap,added,matched};
}
/** Whole-entry selection keeps schedule/counters coherent; never add two device totals. */
export function selectSkillEntry(pc:any,phone:any,mode:SkillChoice){if(pc===undefined)return phone;if(phone===undefined)return pc;if(mode==='phone')return phone;if(mode==='computer')return pc;return typeof phone?.attempts==='number'&&phone.attempts>(typeof pc?.attempts==='number'?pc.attempts:0)?phone:pc;}
