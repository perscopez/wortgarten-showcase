import compact from '../data/compact-card-data.json';
import {withCaseNote} from './case-hint';

/**
 * Pattern (collocation / Rektion) practice with a memory of its own.
 * Every pattern has its own progress, separate from the word: the word may be well known while
 * "gegen eine Regel verstoßen" is not. Difficulty rises with each success:
 *   streak 0 → choose the preposition (or order the words), 1 → order the words,
 *   2 → fill the missing word, 3+ → type the whole pattern from Turkish; streak 4+ counts as settled.
 */
export const PATTERN_KEY='wortgarten-pattern-progress-v1';
export type PatternStat={attempts:number;correct:number;streak:number;last:number;due:number};
export type PatternProgress={version:1;items:Record<string,PatternStat>};
export type PatternRow={id:string;word:string;de:string;tr:string;phrase:string};
export type PatternPick={row:PatternRow;stat?:PatternStat;rank:0|1|2|3;tier:0|1|2|3};

const DAY=86400000,MINUTE=60000;
/** Days until the next review after a success; a miss comes back in ten minutes. */
const INTERVALS=[0,1,3,7,14,30];
export const SETTLED_STREAK=4;
const MAX_ITEMS=3000;

type Pairs=Record<string,string[][]|undefined>;
const norm=(s:string)=>s.normalize('NFC').trim();
const lower=(s:string)=>norm(s).toLocaleLowerCase('de');

function seeded(seed:string){let h=2166136261;for(let i=0;i<seed.length;i++){h^=seed.charCodeAt(i);h=Math.imul(h,16777619);}return()=>{h^=h<<13;h^=h>>>17;h^=h<<5;return((h>>>0)%100000)/100000;};}

/** Curated patterns for a word as [German, Turkish] rows (reflexive verbs are found with or without "sich"). */
export function patternRows(word:string):[string,string][]{
 const key=norm(word);
 const bare=key.replace(/^sich\s+/i,'');
 const groups=[compact.verbPatterns as Pairs,compact.adjectives as Pairs,compact.nouns as Pairs,compact.more as Pairs];
 const rows:[string,string][]=[];const seen=new Set<string>();
 // Exact spelling wins; art manifests list nouns in lower case, so a capitalised spelling is also tried, but only when the exact one is missing.
 const cap=bare.charAt(0).toLocaleUpperCase('de')+bare.slice(1);
 for(const spelling of [[key,bare,'sich '+bare],[bare.toLocaleLowerCase('de')],[cap]]){
  for(const group of groups)for(const k of spelling)if(Object.hasOwn(group,k))for(const [de,tr=''] of group[k]||[])if(de&&!seen.has(de)){seen.add(de);rows.push([withCaseNote(de),tr]);}
  if(rows.length)break;
 }
 // Phrases are listed with their natural capitalisation; match them regardless of case as a last resort.
 if(!rows.length){const want=bare.toLocaleLowerCase('de');for(const group of groups){const k=Object.keys(group).find(x=>x.toLocaleLowerCase('de')===want);if(k)for(const [de,tr=''] of group[k]||[])if(de&&!seen.has(de)){seen.add(de);rows.push([withCaseNote(de),tr]);}}}
 return rows;
}
/** The German phrase of a pattern row without its grammar note ("· auf + Akkusativ", "(Dativ)"). */
export const phraseOf=(de:string)=>de.replace(/\s*·.*$/,'').replace(/\s*\((Akkusativ|Dativ|Genitiv)(,\s*(Akkusativ|Dativ|Genitiv))?\)$/,'').replace(/\s*\(österr\.\)$/,'').trim();

export const patternId=(word:string,phrase:string)=>(lower(word)+'|'+lower(phrase)).slice(0,160);

/** Patterns that can be practised: Turkish known, 2–7 words, no placeholders like "…". */
export type PersonalPattern=[string,string];
type PatternTarget=string|{word:string;patterns?:readonly PersonalPattern[]};
export function parsePersonalPatterns(value:unknown):PersonalPattern[]|undefined{
 if(value===undefined)return;
 if(!Array.isArray(value)||value.length>24)throw Error('Bir karta en çok 24 kalıp eklenebilir.');
 const result:PersonalPattern[]=[],seen=new Set<string>();
 for(const row of value){
  if(!Array.isArray(row)||row.length!==2||!row.every(v=>typeof v==='string'&&v.trim()&&v.length<=240))throw Error('Kalıp Almanca ve Türkçe iki metin içermeli.');
  const [de,tr]=row.map(norm),phrase=phraseOf(de),length=phrase.split(/\s+/).length;
  if(length<2||length>7||/…|\.\.\./.test(phrase))throw Error('Kalıbın Almanca bölümü 2–7 kelime içermeli ve boşluksuz tamamlanmalı.');
  const key=lower(phrase);
  if(seen.has(key))throw Error('Aynı Almanca kalıp iki kez eklenemez.');
  seen.add(key);result.push([de,tr]);
 }
 return result;
}
const ROWS_CACHE=new Map<string,PatternRow[]>();
/** Pure and called for every card on every render of the pattern pages, so the result is remembered per word. */
export function rowsFor(target:PatternTarget):PatternRow[]{
 const word=typeof target==='string'?target:target.word;
 if(typeof target!=='string'&&target.patterns?.length)return computeRows(word,target.patterns);

 const cached=ROWS_CACHE.get(word);if(cached)return cached;
 const rows=computeRows(word);if(ROWS_CACHE.size>6000)ROWS_CACHE.clear();ROWS_CACHE.set(word,rows);return rows;
}
function computeRows(word:string,personal:readonly PersonalPattern[]=[]):PatternRow[]{
 const out:PatternRow[]=[],seen=new Set<string>();
 for(const [de,tr] of [...personal,...patternRows(word)]){
  const phrase=phraseOf(de),n=phrase.split(/\s+/).filter(Boolean).length;
  if(!tr||n<2||n>7||/…|\.\.\./.test(phrase)||seen.has(lower(phrase)))continue;
  seen.add(lower(phrase));out.push({id:patternId(word,phrase),word,de,tr,phrase});
 }
 return out;
}

// ---- progress ----
export const emptyPatternProgress=():PatternProgress=>({version:1,items:{}});
const count=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
export function parsePatternProgress(value:unknown):PatternProgress{
 if(value===null||value===undefined)return emptyPatternProgress();
 const v=value as PatternProgress;
 if(!v||v.version!==1||!v.items||typeof v.items!=='object'||Array.isArray(v.items))throw Error('Kalıp ilerlemesi okunamadı.');
 const entries=Object.entries(v.items);if(entries.length>MAX_ITEMS)throw Error('Kalıp ilerlemesi çok büyük.');
 for(const [id,s] of entries)if(!id||id.length>200||!s||!count(s.attempts)||!count(s.correct)||!count(s.streak)||s.correct>s.attempts||!Number.isFinite(s.last)||s.last<0||!Number.isFinite(s.due)||s.due<0)throw Error('Kalıp kaydı geçersiz.');
 return v;
}
export function recordPattern(progress:PatternProgress,id:string,ok:boolean,now=Date.now()):PatternProgress{
 const old=Object.hasOwn(progress.items,id)?progress.items[id]:{attempts:0,correct:0,streak:0,last:0,due:0};
 const streak=ok?old.streak+1:0;
 const stat:PatternStat={attempts:old.attempts+1,correct:old.correct+(ok?1:0),streak,last:now,due:ok?now+INTERVALS[Math.min(streak,INTERVALS.length-1)]*DAY:now+10*MINUTE};
 const items={...progress.items,[id]:stat};
 const keys=Object.keys(items);
 if(keys.length>MAX_ITEMS)for(const k of keys.sort((a,b)=>items[a].last-items[b].last).slice(0,keys.length-MAX_ITEMS))delete items[k];
 return{version:1,items};
}
export const tierOf=(stat?:PatternStat):0|1|2|3=>Math.min(3,stat?.streak||0) as 0|1|2|3;
export const isSettled=(stat?:PatternStat)=>!!stat&&stat.streak>=SETTLED_STREAK;

/**
 * Rank the patterns of a word: just missed first (worth another go now), then due reviews,
 * then never practised, then the rest. Ties are broken with a stable shuffle per day.
 */
export function rankPatterns(word:PatternTarget,progress:PatternProgress|null|undefined,seed='',now=Date.now()):PatternPick[]{
 const items=progress?.items||{};const random=seeded(lower(typeof word==='string'?word:word.word)+':rank:'+seed);
 return rowsFor(word).map(row=>{
  const stat=Object.hasOwn(items,row.id)?items[row.id]:undefined;
  // Reviews come before new material: a pattern that is due beats one never practised.
  const rank:0|1|2|3=stat&&stat.streak===0&&stat.attempts>0&&now>=stat.last&&now-stat.last<30*MINUTE?0:!stat?2:stat.due<=now?1:3;
  return{row,stat,rank,tier:tierOf(stat),r:random()};
 }).sort((a,b)=>a.rank-b.rank||(a.rank===0?b.stat!.last-a.stat!.last:a.rank===1||a.rank===3?(a.stat?.due||0)-(b.stat?.due||0):0)||a.r-b.r).map(({r,...pick})=>{void r;return pick;});
}
export const choosePattern=(word:PatternTarget,progress:PatternProgress|null|undefined,seed='',now=Date.now())=>rankPatterns(word,progress,seed,now)[0]||null;

export type PatternOverview={total:number;fresh:number;learning:number;settled:number;due:number;words:number};
/** Counts over the patterns of the learner's own words. */
export function patternOverview(words:PatternTarget[],progress:PatternProgress|null|undefined,now=Date.now()):PatternOverview{
 const o:PatternOverview={total:0,fresh:0,learning:0,settled:0,due:0,words:0};const seen=new Set<string>();
 const items=progress?.items;
 for(const w of words){
  const rows=rowsFor(w).filter(r=>!seen.has(r.id));if(!rows.length)continue;o.words++;
  for(const r of rows){seen.add(r.id);o.total++;const s=items&&Object.hasOwn(items,r.id)?items[r.id]:undefined;if(!s)o.fresh++;else if(isSettled(s))o.settled++;else o.learning++;if(s&&s.due<=now)o.due++;}
 }
 return o;
}
