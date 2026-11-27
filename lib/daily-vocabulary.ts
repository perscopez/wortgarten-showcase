import type {Inflections} from './inflections';
import type {RectionData} from './rection';
import type {LibraryPhoto} from '../components/library-images';
import {reviewedVisualFor} from './reviewed-art';
import {discoverySenses} from './discovery-senses';
import reviewed from './reviewed-lexicon.json';
import meanings from './daily-meanings.json';
import extra from './daily-new-words.json';
import frequencyCorrections from '../data/frequency-meaning-corrections.json';
import {reviewDay,validReviewState,type ScheduledCard,type Rating} from './review-scheduler';
export const DAILY_TARGET_MS=20*60*1000;
export const DAILY_SESSION_KEY='wortgarten-daily-vocabulary-v1';
export type DailyCard=ScheduledCard&{patterns?:import('./pattern-practice').PersonalPattern[];word:string;meaning:string;article:string;plural?:string;example?:string;translation?:string;partOfSpeech?:string;qualityFlag?:{status:string};photo?:LibraryPhoto;note?:string;source?:string;inflections?:Inflections;rection?:RectionData};
const norm=(s:string)=>s.normalize('NFC').trim().replace(/^(der|die|das)\s+/i,'').toLocaleLowerCase('de');
const essentials=new Set('sein haben werden können müssen dürfen sollen wollen möchten mögen machen gehen kommen geben nehmen finden brauchen kaufen bezahlen kosten fragen antworten beantworten verstehen erklären sprechen reden sagen hören sehen lesen schreiben lernen arbeiten wohnen leben essen trinken helfen warten suchen wissen kennen treffen fahren bleiben öffnen schließen bestellen bekommen wechseln zeigen erlauben entschuldigen verlieren packung preis rabatt kunde lösung rechnung termin fahrstuhl treppe küche kaffee brot käse gurke glas becher arzt bahnhof karte geld'.split(' '));
export function dailyMeaning(card:Pick<DailyCard,'word'|'meaning'|'article'|'qualityFlag'>&Partial<Pick<DailyCard,'example'|'translation'|'partOfSpeech'|'patterns'>>){
 if(card.qualityFlag?.status==='pending')return null;
 const corrected=Object.hasOwn(frequencyCorrections,card.word)&&
  (frequencyCorrections as Record<string,string>)[card.word]===card.meaning;
 if((card.patterns!==undefined||corrected)&&card.meaning.trim()){
  return {meaning:card.meaning,checked:corrected,example:card.example||'',translation:card.translation||''};
 }
 const sense=discoverySenses(card.word).find(s=>s.meaning===card.meaning&&s.article===card.article);if(sense)return{meaning:sense.meaning,checked:true,example:sense.example,translation:sense.translation};
 const key=norm(card.word),entry=(extra as Record<string,any>)[key]||(reviewed as Record<string,any>)[key];
 const distinctNoun=card.word==='Wissen'||card.word==='Kosten'||(card.partOfSpeech==='noun'&&entry?.partOfSpeech==='verb');
 const checked=distinctNoun?undefined:(meanings as Record<string,string>)[key]||entry?.meaning;
 const meaning=checked||card.meaning?.trim();
 if(!meaning||meaning.length>1000||/MYMEMORY|QUOTA|TRANSLATION ERROR|bulunamadı|bilinmiyor|^[?—-]+$/i.test(meaning))return null;
 // A different noun gender may identify another sense; don't silently substitute a homonym.
 if(entry?.article&&card.article&&entry.article!==card.article)return {meaning:card.meaning,checked:false,example:card.example||'',translation:card.translation||''};
 return {meaning,checked:!!checked,example:(!distinctNoun&&entry?.example)||card.example||'',translation:(!distinctNoun&&entry?.translation)||card.translation||''};
}
export function dailyImportance(card:DailyCard){return essentials.has(norm(card.word))?1:0;}
const dailyTopics=[
 ['Market','Salat','Packung','im Angebot sein','Angebot','Preis','Rabatt','Kasse','Einkaufswagen','Quittung','Brot','Milch','Obst','Gemüse','bezahlen','kaufen'],
 ['Ulaşım','Bahnhof','Fahrkarte','Haltestelle','umsteigen','ankommen','abfahren','Verspätung','Gleis','Zug','Fahrplan'],
 ['Randevu','Termin','vereinbaren','absagen','verschieben','bestätigen','Sprechstunde','anrufen'],
 ['Ev','Miete','Wohnung','Haushalt','Rechnung','Schlüssel','Nachbar','umziehen'],
].map(([label,...words])=>({label,words:new Set(words.map(norm))}));
export const dailyTopic=(word:string)=>dailyTopics.find(topic=>topic.words.has(norm(word)))?.label;
/** Small batches, not a daily cap. Alternate new arrivals with long-unseen cards. */
export function dailySelection<T extends DailyCard>(cards:T[],now=Date.now()):T[]{
 const eligible=[...new Map(cards.filter(c=>dailyMeaning(c)).map(c=>[c.id,c])).values()];
 const tie=(a:T,b:T)=>a.id.localeCompare(b.id);
 const last=(c:T)=>validReviewState(c.reviewState)?(c.reviewState.events.at(-1)?.at??0):0;
 const unseen=(a:T,b:T)=>last(a)-last(b)||(a.created||0)-(b.created||0)||tie(a,b);
 const rotation=[...eligible].sort(unseen);
 const recent=eligible.filter(c=>!c.reviews&&!c.id.startsWith('seed-')).sort((a,b)=>(b.created||0)-(a.created||0)||tie(a,b));
 const due=eligible.filter(c=>c.reviews>0&&c.due<=now).sort((a,b)=>a.due-b.due||unseen(a,b));
 const basic=[...rotation].filter(c=>dailyImportance(c)>0);
 // Keep due-review slots. Use two otherwise-new slots for one small everyday vocabulary family.
 const themed=rotation.filter(c=>c.reviews===0&&dailyTopic(c.word));
 const available=dailyTopics.filter(t=>themed.filter(c=>t.words.has(norm(c.word))).length>=2);
 const preferred=available.find(t=>recent[0]&&!recent[0].id.startsWith('pack-')&&t.words.has(norm(recent[0].word)));
 const day=Math.floor(now/86400000);
 const topic=preferred||(available.length?available[((day%available.length)+available.length)%available.length]:undefined);
 const related=topic?themed.filter(c=>topic.words.has(norm(c.word))):[];
 const buckets=[recent,related.length?related:rotation,due,related.length?related:rotation,basic,rotation];
 const out:T[]=[],seen=new Set<string>();
 while(out.length<12){
  const n=out.length%buckets.length;
  const bucket=out.length>=6?(due.length>=6?due:(n===1||n===3)?rotation:buckets[n]):buckets[n];
  const c=bucket.find(c=>!seen.has(c.id))||rotation.find(c=>!seen.has(c.id));
  if(!c)break;out.push(c);seen.add(c.id);
 }
 return out;
}
export type DailyRetry=
 |{kind:'article'}
 |{kind:'context';previousSentence?:string}
 |{kind:'pattern';patternId:string;focus:'preposition'|'case'|'phrase'};
export type DailyFeedback={retry?:DailyRetry;assisted?:boolean};
export type DailyItem={id:string;reverse:boolean;round:number;retry?:DailyRetry};
function validRetry(v:DailyRetry|undefined){
 if(v===undefined)return true;
 if(!v||typeof v!=='object')return false;
 if(v.kind==='article')return true;
 if(v.kind==='context')return v.previousSentence===undefined||typeof v.previousSentence==='string'&&v.previousSentence.length<=280;
 return v.kind==='pattern'&&typeof v.patternId==='string'&&v.patternId.length>0&&v.patternId.length<=160&&['preposition','case','phrase'].includes(v.focus);
}
export type DailySession={version:1;day:string;elapsed:number;earlier?:number;queue:DailyItem[];answers:{id:string;rating:Rating;at:number;assisted?:boolean}[];finished:boolean;knownIds?:string[];newIds?:string[];skipped?:string[]};
export function newDailySession(cards:DailyCard[],now=Date.now()):DailySession{const ids=dailySelection(cards,now).map(c=>c.id);return{version:1,day:reviewDay(now),elapsed:0,queue:[...ids.map(id=>({id,reverse:false,round:0})),...ids.map(id=>({id,reverse:true,round:1}))],answers:[],finished:false,knownIds:cards.map(c=>c.id),newIds:ids.filter(id=>!cards.find(c=>c.id===id)?.reviews)};}
export function readDailySession(raw:string|null,now:number|null=Date.now()):DailySession|null{try{const s=JSON.parse(raw||'null');if(!s||s.version!==1||(now===null?!/^\d{4}-\d{2}-\d{2}$/.test(s.day):s.day!==reviewDay(now))||!Number.isFinite(s.elapsed)||s.elapsed<0||s.elapsed>DAILY_TARGET_MS||typeof s.finished!=='boolean'||(s.earlier!==undefined&&(!Number.isFinite(s.earlier)||s.earlier<0))||(s.skipped!==undefined&&(!Array.isArray(s.skipped)||s.skipped.length>5000||!s.skipped.every((id:any)=>typeof id==='string')))||(s.knownIds!==undefined&&(!Array.isArray(s.knownIds)||s.knownIds.length>5000||!s.knownIds.every((id:any)=>typeof id==='string')))||(s.newIds!==undefined&&(!Array.isArray(s.newIds)||s.newIds.length>5000||!s.newIds.every((id:any)=>typeof id==='string')))||!Array.isArray(s.queue)||s.queue.length>200||!s.queue.every((i:any)=>typeof i.id==='string'&&typeof i.reverse==='boolean'&&Number.isInteger(i.round)&&i.round>=0&&i.round<=3&&validRetry(i.retry))||!Array.isArray(s.answers)||s.answers.length>5000||!s.answers.every((a:any)=>typeof a.id==='string'&&[0,1,2,3].includes(a.rating)&&Number.isFinite(a.at)&&(a.assisted===undefined||typeof a.assisted==='boolean')))return null;return s;}catch{return null}}
export function advanceDaily(s:DailySession,rating:Rating,now=Date.now(),feedback?:DailyFeedback):DailySession{const [item,...remaining]=s.queue;if(!item||s.finished)return s;const queue=rating===3?remaining.filter(i=>i.id!==item.id):remaining;// Successive relearning: a missed item returns a few cards later, up to two retries (rounds 2 and 3).
 if(rating<=1&&item.round<3)queue.splice(Math.min(3,queue.length),0,{...item,round:Math.max(2,item.round+1),...(feedback?.retry?{retry:feedback.retry}:{})});return{...s,queue,answers:[...s.answers,{id:item.id,rating,at:now,...(feedback?.assisted?{assisted:true}:{})}],finished:s.elapsed>=DAILY_TARGET_MS||queue.length===0};}
/** Only foreground ticks count. Long throttled/closed-tab intervals are never credited. */
export function dailyElapsed(elapsed:number,delta:number,active:boolean){return Math.min(DAILY_TARGET_MS,Math.max(0,elapsed)+(active&&Number.isFinite(delta)?Math.max(0,Math.min(1000,delta)):0));}

const mergeNewIds=(prev:string[]|undefined,ids:string[],cards:DailyCard[])=>[...new Set([...(prev||[]),...ids.filter(id=>!cards.find(c=>c.id===id)?.reviews)])].slice(-5000);

/** New arrivals enter ahead of the next batch; retain already scheduled cards. */
export function mergeAddedDailyCards(s:DailySession,cards:DailyCard[]):DailySession{
 if(s.elapsed>=DAILY_TARGET_MS)return s;
 if(!s.knownIds)return {...s,knownIds:cards.map(c=>c.id).slice(-5000)};
 const known=new Set(s.knownIds),seen=new Set([...s.queue.map(i=>i.id),...s.answers.map(a=>a.id),...(s.skipped||[])]);
 const packIds=cards.filter(c=>!known.has(c.id)&&c.id.startsWith('pack-')).map(c=>c.id);
 const added=cards.filter(c=>!known.has(c.id)&&!seen.has(c.id)&&!c.id.startsWith('seed-')&&!c.id.startsWith('pack-')&&dailyMeaning(c))
  .sort((a,b)=>(b.created||0)-(a.created||0)||a.id.localeCompare(b.id)).slice(0,Math.min(12,Math.max(0,Math.floor((180-s.queue.length)/2))));
 if(!added.length)return packIds.length?{...s,knownIds:[...known,...packIds].slice(-5000)}:s;
 const addedIds=added.map(c=>c.id);
 return {...s,finished:false,knownIds:[...known,...packIds,...addedIds].slice(-5000),newIds:mergeNewIds(s.newIds,addedIds,cards),
 queue:[...added.map(c=>({id:c.id,reverse:false,round:0})),...s.queue,...added.map(c=>({id:c.id,reverse:true,round:1}))]};
}

export function starterOnly(cards:DailyCard[]){return cards.length>0&&cards.every(c=>c.id.startsWith('seed-'));}
/** When a batch empties, continue with cards not yet answered today (starters included for new learners). */
export function continueDailySession(s:DailySession,cards:DailyCard[],now=Date.now()):DailySession{
 
 if(s.elapsed>=DAILY_TARGET_MS||s.queue.length)return s;
 const answered=new Set([...s.answers.map(a=>a.id),...(s.skipped||[])]);
 const available=cards.filter(c=>!answered.has(c.id));
 const picked=dailySelection(available,now);
 if(!picked.length)return s.finished?s:{...s,finished:true};
 const ids=picked.map(c=>c.id);return{...s,finished:false,knownIds:cards.map(c=>c.id),newIds:mergeNewIds(s.newIds,ids,cards),queue:[...ids.map(id=>({id,reverse:false,round:0})),...ids.map(id=>({id,reverse:true,round:1}))]};
}
/** Total study time today: finished earlier blocks plus the running one. */
export const dailyTotal=(s:{elapsed:number;earlier?:number})=>(s.earlier||0)+s.elapsed;
/**
 * "Keep going today": starts another block of `minutes` (10 or 20) on the same day. The finished blocks are kept in `earlier`
 * so total time stays continuous; the queue prefers words not answered yet today and falls back to the whole deck.
 */
export function extendDailySession(s:DailySession,cards:DailyCard[],now=Date.now(),minutes=10):DailySession{
 const block=Math.max(1,Math.min(20,minutes))*60000;
 const elapsed=Math.min(DAILY_TARGET_MS-block,s.elapsed);
 const answered=new Set(s.answers.map(a=>a.id));
 let picked=dailySelection(cards.filter(c=>!answered.has(c.id)),now);
 if(!picked.length)picked=dailySelection(cards,now);
 if(!picked.length)return s;
 const ids=picked.map(c=>c.id);
 return{...s,finished:false,elapsed,earlier:(s.earlier||0)+s.elapsed-elapsed,knownIds:cards.map(c=>c.id),newIds:mergeNewIds(s.newIds,ids,cards),queue:[...ids.map(id=>({id,reverse:false,round:0})),...ids.map(id=>({id,reverse:true,round:1}))]};
}
/** Words the learner keeps getting wrong: lapsed twice or more, or the last answer was a miss. Worst first. */
export function weakCards<T extends DailyCard>(cards:T[]):T[]{
 const lapses=(c:T)=>validReviewState(c.reviewState)?c.reviewState.lapses:0;
 const lastMiss=(c:T)=>validReviewState(c.reviewState)&&c.reviewState.events.at(-1)?.rating===0;
 return cards.filter(c=>dailyMeaning(c)&&c.reviews>0&&validReviewState(c.reviewState)&&(lapses(c)>=2||lastMiss(c))).sort((a,b)=>lapses(b)-lapses(a)||a.id.localeCompare(b.id));
}
/**
 * A block made only of the weak words (up to 12), asked forwards and backwards. It continues today's session;
 * when the daily target is already reached it opens a 10 minute block like "keep going today".
 */
export function weakWordsSession(s:DailySession|null,cards:DailyCard[],now=Date.now()):DailySession|null{
 const weak=weakCards(cards).slice(0,12);if(!weak.length)return null;
 const base=s&&s.day===reviewDay(now)?s:newDailySession(cards,now);
 const elapsed=base.elapsed>=DAILY_TARGET_MS?DAILY_TARGET_MS-10*60000:base.elapsed;
 const ids=weak.map(c=>c.id);
 return{...base,finished:false,elapsed,earlier:(base.earlier||0)+base.elapsed-elapsed,knownIds:cards.map(c=>c.id),newIds:mergeNewIds(base.newIds,ids,cards),queue:[...ids.map(id=>({id,reverse:false,round:0})),...ids.map(id=>({id,reverse:true,round:1}))]};
}
/** Terminal session cannot accrue time, even if a stale interval callback fires. */
export function tickDailySession(s:DailySession,delta:number,active:boolean):DailySession{if(s.finished||!s.queue.length||s.elapsed>=DAILY_TARGET_MS)return s;return{...s,elapsed:dailyElapsed(s.elapsed,delta,active)};}

export function skipDailyCard(s:DailySession):DailySession{const id=s.queue[0]?.id;if(!id)return s;const queue=s.queue.filter(i=>i.id!==id);return{...s,queue,skipped:[...new Set([...(s.skipped||[]),id])],finished:!queue.length};}

/** Keep a chosen image; only exact-sense curated local art may fill a missing one. */
export function dailyPhoto(card:Pick<DailyCard,'word'|'meaning'|'photo'>):LibraryPhoto|undefined{
 return card.photo?.url?card.photo:reviewedVisualFor(card.word,card.meaning)[0];
}

/** A translation occasionally contains the headword verbatim. Ask forward in that case. */
export function safeDailyReverse(word:string,meaning:string,requested:boolean){
 if(!requested)return false;
 const token=(v:string)=>' '+v.normalize('NFC').toLocaleLowerCase('de').replace(/[^\p{L}\p{N}]+/gu,' ').trim()+' ';
 return !token(meaning).includes(token(word));
}

/** After a finished round: one more hinted pass over the words that were missed (successive relearning). */
export function hardRound(s:DailySession,ids:string[]):DailySession{
 const unique=[...new Set(ids)].slice(0,30);
 if(!unique.length||s.elapsed>=DAILY_TARGET_MS)return s;
 return{...s,finished:false,queue:unique.map(id=>({id,reverse:true,round:2}))};
}
