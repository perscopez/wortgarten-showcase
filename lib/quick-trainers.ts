import {BASIC_WORDS,basicWordKey} from './basic-words';
import {WORD_PACKS} from './word-packs';
import b1Words from './b1-words.json';
import freqWords from './frequency-words.json';
import compactData from '../data/compact-card-data.json';
import {getRection,listRectionLemmas,type GovernedCase} from './rection';
import {rowsFor} from './pattern-practice';
import {patternQuizOfRow} from './daily-exercise';
import {ANTONYM_PAIRS,KONJUGATION_BANK,PRAEPOSITION_BANK} from './quick-trainers-data';

export {ANTONYM_PAIRS,KONJUGATION_BANK,PRAEPOSITION_BANK};

export type QuickTrainerKind='artikel'|'praepositionen'|'konjugation'|'verbinden';
export type CefrLevel='all'|'A1'|'A2'|'B1'|'B2';
export type KonjugationTense='praesens'|'praeteritum'|'perfekt';
export type VerbindenMode='words'|'rection'|'patterns'|'antonyms';
export type ArticleValue='der'|'die'|'das';

export interface QuickCardInput{
 id:string;
 word:string;
 article?:string;
 plural?:string;
 meaning?:string;
 partOfSpeech?:string;
 articleAmbiguous?:boolean;
 qualityFlag?:{status?:string};
}

export interface ArtikelItem{
 id:string;
 word:string;
 article:ArticleValue;
 plural:string;
 meaning:string;
 cue:string;
}

export interface PraepositionItem{
 id:string;
 level:'A1'|'A2'|'B1'|'B2';
 before:string;
 answer:string;
 after:string;
 governed:GovernedCase|'Wechsel';
 translation:string;
 options:string[];
 note:string;
}

export interface KonjugationVerb{
 infinitive:string;
 meaning:string;
 level:'A1'|'A2'|'B1'|'B2';
 aux:'haben'|'sein';
 partizip:string;
 praesens:[string,string,string,string,string,string];
 praeteritum:[string,string,string,string,string,string];
}

export interface KonjugationItem{
 id:string;
 infinitive:string;
 meaning:string;
 level:'A1'|'A2'|'B1'|'B2';
 tense:KonjugationTense;
 personIndex:0|1|2|3|4|5;
 pronoun:string;
 answer:string;
}

export interface VerbindenPair{
 id:string;
 left:string;
 right:string;
 detail?:string;
}

export interface VerbindenBoard{
 id:string;
 pairs:VerbindenPair[];
 rightOrder:string[];
}

export const QUICK_TRAINERS:{
 kind:QuickTrainerKind;
 title:string;
 subtitle:string;
 badge:string;
}[]=[
 {kind:'artikel',title:'der/die/das',subtitle:'Artikel çalış',badge:'~5 dk'},
 {kind:'praepositionen',title:'Präpositionen',subtitle:'A1 – B2 edatlar',badge:'~5 dk'},
 {kind:'konjugation',title:'Konjugation',subtitle:'Fiil çekimi yaz',badge:'~5 dk'},
 {kind:'verbinden',title:'Verbinden',subtitle:'Çizgi çekerek eşleştir',badge:'~5 dk'},
];

const PRONOUNS=['ich','du','er/sie/es','wir','ihr','sie/Sie'] as const;
const HABEN_PRES=['habe','hast','hat','haben','habt','haben'] as const;
const SEIN_PRES=['bin','bist','ist','sind','seid','sind'] as const;

type RawJsonWord={word:string;article?:string;plural?:string;meaning?:string;partOfSpeech?:string};
const B1_LIST:RawJsonWord[]=Array.isArray((b1Words as {words?:RawJsonWord[]}).words)?(b1Words as {words:RawJsonWord[]}).words:[];
const FREQ_LIST:RawJsonWord[]=Array.isArray((freqWords as {words?:RawJsonWord[]}).words)?(freqWords as {words:RawJsonWord[]}).words:Array.isArray(freqWords)?(freqWords as unknown as RawJsonWord[]):[];

function seeded(seed:string){
 let h=2166136261>>>0;
 for(let i=0;i<seed.length;i++){h^=seed.charCodeAt(i);h=Math.imul(h,16777619);}
 return ()=>{h+=0x6d2b79f5;let t=Math.imul(h^(h>>>15),1|h);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};
}

function shuffle<T>(list:T[],rand:()=>number):T[]{
 const out=[...list];
 for(let i=out.length-1;i>0;i--){
  const j=Math.floor(rand()*(i+1));
  [out[i],out[j]]=[out[j],out[i]];
 }
 return out;
}

function cleanMeaning(raw:string):string{
 let depth=0,cut=raw.length;
 for(let i=0;i<raw.length;i++){
  const ch=raw[i];
  if(ch==='(')depth++;
  else if(ch===')'&&depth>0)depth--;
  else if(depth===0&&(ch===';'||ch===',')){cut=i;break;}
 }
 return raw.slice(0,cut).trim()||raw.trim();
}

export function articleCue(word:string,article:ArticleValue):string{
 const w=word.toLocaleLowerCase('de');
 if(article==='die'){
  if(/(ung|heit|keit|schaft|tion|sion|tät|ik|ei)$/.test(w))return `-${w.match(/(ung|heit|keit|schaft|tion|sion|tät|ik|ei)$/)?.[1]} son eki genelde die alır.`;
  if(/e$/.test(w)&&w.length>=4)return '-e ile biten çoğu isim die alır.';
 }
 if(article==='das'){
  if(/(chen|lein|ment|tum|um|ma)$/.test(w))return `-${w.match(/(chen|lein|ment|tum|um|ma)$/)?.[1]} son eki genelde das alır.`;
 }
 if(article==='der'){
  if(/(ling|ismus|or|ig|ich)$/.test(w))return `-${w.match(/(ling|ismus|or|ig|ich)$/)?.[1]} son eki genelde der alır.`;
 }
 return article==='der'?'Eril isim (der)':article==='die'?'Dişil isim (die)':'Nötr isim (das)';
}

export function buildArtikelPool(cards:QuickCardInput[]):ArtikelItem[]{
 const seen=new Set<string>();
 const blocked=new Set<string>();
 for(const c of cards){
  if(c.articleAmbiguous||c.qualityFlag?.status==='pending'){
   const key=basicWordKey((c.word||'').trim());
   if(key)blocked.add(key);
  }
 }
 const pool:ArtikelItem[]=[];
 const push=(c:QuickCardInput,prefix:string)=>{
  if(c.articleAmbiguous||c.qualityFlag?.status==='pending')return;
  const art=(c.article||'').trim().toLocaleLowerCase('de');
  if(art!=='der'&&art!=='die'&&art!=='das')return;
  const word=(c.word||'').trim();
  if(!word||word.includes(' ')||!/^\p{Lu}/u.test(word))return;
  const key=basicWordKey(word);
  if(!key||seen.has(key)||blocked.has(key))return;
  const meaning=cleanMeaning(c.meaning||'');
  if(!meaning)return;
  seen.add(key);
  pool.push({id:`${prefix}:${key}`,word,article:art,plural:(c.plural||'').trim(),meaning,cue:articleCue(word,art)});
 };
 for(const c of cards)push(c,'u');
 for(const b of BASIC_WORDS)push({...b,id:'b-'+b.word},'b');
 for(const p of WORD_PACKS)for(const w of p.words)push({...w,id:p.id+'-'+w.word},'p');
 for(const w of B1_LIST)push({...w,id:'b1-'+w.word},'b1');
 for(const w of FREQ_LIST)push({...w,id:'fq-'+w.word},'fq');
 return pool;
}

export function buildArtikelRound(cards:QuickCardInput[],count=15,seed='artikel'):ArtikelItem[]{
 const rand=seeded(seed);
 return shuffle(buildArtikelPool(cards),rand).slice(0,Math.max(1,count));
}

export function checkArtikelAnswer(item:ArtikelItem,chosen:ArticleValue){
 return {ok:item.article===chosen,expected:item.article,cue:item.cue};
}

export function buildPraepositionenRound(level:CefrLevel='all',count=15,seed='praep'):PraepositionItem[]{
 const rand=seeded(seed+':'+level);
 const base=level==='all'?PRAEPOSITION_BANK:PRAEPOSITION_BANK.filter(i=>i.level===level);
 const items=base.map(i=>({...i,options:shuffle(i.options,rand)}));
 if(level==='all'||level==='B1'){
  const extra:PraepositionItem[]=[];
  const seenSentence=new Set(items.map(i=>(i.before+' '+i.answer+' '+i.after).toLocaleLowerCase('de')));
  for(const lemma of listRectionLemmas()){
   for(const row of rowsFor(lemma)){
    const q=patternQuizOfRow(row,seed);
    if(!q||q.options.length<4)continue;
    const full=(q.before+' '+q.answer+' '+q.after).toLocaleLowerCase('de');
    if(seenSentence.has(full))continue;
    const opts=q.options.map(o=>o.label);
    if(new Set(opts).size!==4||!opts.includes(q.answer))continue;
    const gov:GovernedCase|'Wechsel'=q.governed==='Akkusativ'||q.governed==='Dativ'||q.governed==='Genitiv'?q.governed:'Wechsel';
    seenSentence.add(full);
    extra.push({
     id:'pr-pat-'+row.id,
     level:'B1',
     before:q.before,
     answer:q.answer,
     after:q.after,
     governed:gov,
     translation:q.tr,
     options:opts,
     note:`${lemma}: ${q.answer} + ${gov}`,
    });
   }
  }
  const merged=[...items,...shuffle(extra,rand).slice(0,10)];
  return shuffle(merged,rand).slice(0,Math.max(1,count));
 }
 return shuffle(items,rand).slice(0,Math.max(1,count));
}

export function conjugateVerb(verb:KonjugationVerb,tense:KonjugationTense,personIndex:0|1|2|3|4|5):string{
 if(tense==='praesens')return verb.praesens[personIndex];
 if(tense==='praeteritum')return verb.praeteritum[personIndex];
 const auxForm=verb.aux==='sein'?SEIN_PRES[personIndex]:HABEN_PRES[personIndex];
 return `${auxForm} ${verb.partizip}`;
}

export function buildKonjugationRound(tense:KonjugationTense='praesens',level:CefrLevel='all',count=15,seed='konj'):KonjugationItem[]{
 const rand=seeded(`${seed}:${tense}:${level}`);
 const verbs=level==='all'?KONJUGATION_BANK:KONJUGATION_BANK.filter(v=>v.level===level);
 const picked=shuffle(verbs,rand).slice(0,Math.max(1,count));
 return picked.map((v,idx)=>{
  const personIndex=Math.floor(rand()*6) as 0|1|2|3|4|5;
  return {
   id:`konj:${v.infinitive}:${tense}:${personIndex}:${idx}`,
   infinitive:v.infinitive,
   meaning:v.meaning,
   level:v.level,
   tense,
   personIndex,
   pronoun:PRONOUNS[personIndex],
   answer:conjugateVerb(v,tense,personIndex),
  };
 });
}

const foldDe=(s:string)=>s.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('de');
const translitDe=(s:string)=>foldDe(s).replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss');

export function checkKonjugationAnswer(item:KonjugationItem,rawInput:string):'correct'|'umlaut'|'wrong'|'empty'{
 const got=foldDe(rawInput);
 if(!got)return 'empty';
 const want=foldDe(item.answer);
 if(got===want)return 'correct';
 const pronAlt=item.pronoun.split('/').map(p=>p.toLocaleLowerCase('de'));
 for(const p of pronAlt){
  if(got===`${p} ${want}`)return 'correct';
  if(translitDe(got)===translitDe(`${p} ${want}`))return 'umlaut';
 }
 if(translitDe(got)===translitDe(want))return 'umlaut';
 return 'wrong';
}

function derangeIds(ids:string[],rand:()=>number):string[]{
 if(ids.length<=1)return [...ids];
 for(let tries=0;tries<10;tries++){
  const cand=shuffle(ids,rand);
  if(cand.some((id,i)=>id!==ids[i]))return cand;
 }
 return [...ids.slice(1),ids[0]];
}

const ALL_COMPACT_WORDS:string[]=(()=>{
 const out=new Set<string>();
 const data=compactData as Record<string,Record<string,unknown>>;
 for(const group of ['verbPatterns','adjectives','nouns','more']){
  for(const w of Object.keys(data[group]||{}))out.add(w);
 }
 return [...out];
})();

export function buildVerbindenRound(cards:QuickCardInput[],mode:VerbindenMode='words',boards=3,perBoard=5,seed='verb'):VerbindenBoard[]{
 const rand=seeded(`${seed}:${mode}`);
 const allPairs:VerbindenPair[]=[];

 if(mode==='antonyms'){
  allPairs.push(...ANTONYM_PAIRS);
 }else if(mode==='words'){
  const seenLeft=new Set<string>();
  const seenRight=new Set<string>();
  const addCard=(c:QuickCardInput,prefix:string)=>{
   if(c.qualityFlag?.status==='pending')return;
   const w=(c.word||'').trim();
   const m=cleanMeaning(c.meaning||'');
   if(!w||!m||m.length>46)return;
   const left=c.article&&/^(der|die|das)$/i.test(c.article)?`${c.article} ${w}`:w;
   const lk=left.toLocaleLowerCase('de'),rk=m.toLocaleLowerCase('tr');
   if(seenLeft.has(lk)||seenRight.has(rk))return;
   seenLeft.add(lk);seenRight.add(rk);
   allPairs.push({id:`${prefix}:${lk}`,left,right:m});
  };
  for(const c of shuffle([...cards],rand))addCard(c,'u');
  for(const b of shuffle([...BASIC_WORDS],rand))addCard({...b,id:'b-'+b.word},'b');
  for(const p of WORD_PACKS)for(const w of shuffle([...p.words],rand))addCard({...w,id:p.id+'-'+w.word},'p');
  for(const w of shuffle([...B1_LIST],rand))addCard({...w,id:'b1-'+w.word},'b1');
 }else if(mode==='rection'){
  const seenLeft=new Set<string>();
  for(const lemma of shuffle(listRectionLemmas(),rand)){
   const r=getRection(lemma);
   if(r.status!=='known'||!r.patterns.length)continue;
   const p=r.patterns[0];
   const c=p.complements[0];
   if(!c)continue;
   const right=c.preposition?`${c.preposition} + ${c.case}`:`+ ${c.case}`;
   const lk=lemma.toLocaleLowerCase('de');
   if(seenLeft.has(lk))continue;
   seenLeft.add(lk);
   allPairs.push({id:`rec:${lk}`,left:lemma,right,detail:p.explanation});
  }
 }else{
  const seenLeft=new Set<string>();
  const seenRight=new Set<string>();
  const poolWords=shuffle([...new Set([...cards.map(c=>c.word),...listRectionLemmas(),...ALL_COMPACT_WORDS])],rand);
  for(const w of poolWords){
   for(const row of rowsFor(w)){
    const lk=row.phrase.toLocaleLowerCase('de');
    const rk=row.tr.toLocaleLowerCase('tr');
    if(!row.phrase||!row.tr||row.phrase.length>44||row.tr.length>48)continue;
    if(seenLeft.has(lk)||seenRight.has(rk))continue;
    seenLeft.add(lk);seenRight.add(rk);
    allPairs.push({id:`pat:${row.id}`,left:row.phrase,right:row.tr});
    break;
   }
  }
 }

 const shuffled=shuffle(allPairs,rand);
 const out:VerbindenBoard[]=[];
 let cursor=0;
 for(let b=0;b<boards;b++){
  const boardPairs:VerbindenPair[]=[];
  const usedRight=new Set<string>();
  const usedLeft=new Set<string>();
  while(cursor<shuffled.length&&boardPairs.length<perBoard){
   const item=shuffled[cursor++];
   const rk=item.right.toLocaleLowerCase('tr');
   const lk=item.left.toLocaleLowerCase('de');
   if(usedRight.has(rk)||usedLeft.has(lk))continue;
   usedRight.add(rk);usedLeft.add(lk);
   boardPairs.push(item);
  }
  if(boardPairs.length>=3){
   out.push({
    id:`board-${b+1}`,
    pairs:boardPairs,
    rightOrder:derangeIds(boardPairs.map(p=>p.id),rand),
   });
  }
 }
 return out;
}

export function quickTrainerPoolStats(cards:QuickCardInput[]=[]){
 return {
  artikelNouns:buildArtikelPool(cards).length,
  praepositionenCurated:PRAEPOSITION_BANK.length,
  konjugationVerbs:KONJUGATION_BANK.length,
  konjugationForms:KONJUGATION_BANK.length*3*6,
  verbindenAntonyms:ANTONYM_PAIRS.length,
  verbindenCompactWords:ALL_COMPACT_WORDS.length,
 };
}
