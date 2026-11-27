import type {Inflections} from './inflections';
export type InflectionPracticeCard={id:string;word:string;inflections?:Inflections|null};
export type InflectionLevel='basic'|'advanced';
export type InflectionQuestion={id:string;signature:string;cardId:string;word:string;tableTitle:string;row:string;column:string;answers:string[];advanced:boolean;sources:Inflections['sources'];license:Inflections['license']};
export type InflectionCellProgress={signature:string;attempts:number;correct:number;lapses:number;dayStreak:number;intervalIndex:number;dueDay:string;lastSuccessDay:string|null;lastAnsweredDay:string;lastWasCorrect:boolean};
export type InflectionProgress=Record<string,InflectionCellProgress>;
export const INFLECTION_PROGRESS_KEY='wortgarten-inflection-progress-v1';
export const INFLECTION_INTERVALS=[1,3,7,14,30] as const;
export function normalizeInflectionAnswer(value:string):string{return value.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('de');}
function hash(value:string):string{let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0).toString(36);}
function validAnswer(value:unknown):value is string{return typeof value==='string'&&!!value.trim()&&!/^(?:[-–—?]+|bulunamadı|nicht vorhanden)$/i.test(value.trim())&&!/[{}<>]|\b(?:veraltet|ungebräuchlich|regional|selten)\b|\s\/\s/.test(value);}
function safeUrl(url:unknown):url is string{if(typeof url!=='string')return false;try{return new URL(url).protocol==='https:';}catch{return false;}}
/** Exact saved cells only. No conjugation, noun endings or extra articles generated. */
export function buildInflectionQuestions(cards:InflectionPracticeCard[],level:InflectionLevel='basic'):InflectionQuestion[]{
 const out=new Map<string,InflectionQuestion>();
 for(const card of cards){const d=card.inflections;if(!d||d.version!==1||d.edited||!Array.isArray(d.tables)||!Array.isArray(d.sources)||!d.sources.some(s=>safeUrl(s?.url))||!d.license||!safeUrl(d.license.url))continue;
  const lemma=(d.lemma||card.word).normalize('NFC').trim();if(!lemma)continue;
  for(const table of d.tables){if(!table||typeof table.title!=='string'||!Array.isArray(table.rows)||!Array.isArray(table.columns))continue;
   for(const row of table.rows){if(!row||typeof row.label!=='string'||!Array.isArray(row.cells))continue;
    row.cells.forEach((cell,index)=>{const column=table.columns[index];if(typeof column!=='string'||!Array.isArray(cell)||!cell.length)return;
     // Skip complex source annotations rather than invent a shortened answer.
     if(!cell.every(validAnswer))return;
     const answers=[...new Map(cell.map(s=>[normalizeInflectionAnswer(s),s.trim()])).values()];if(!answers.length)return;
     const advanced=/ek biçimler|konjunktiv|imperativ/i.test(table.title)||/genitiv|konjunktiv|imperativ/i.test(row.label)||/konjunktiv|imperativ/i.test(column);
     if(level==='basic'&&advanced)return;
     const signature=JSON.stringify([lemma,table.title,row.label,column,answers.map(normalizeInflectionAnswer).sort()]);
     const id=`infl-v1:${encodeURIComponent(lemma)}:${hash(signature)}`;
     if(!out.has(id))out.set(id,{id,signature,cardId:card.id,word:lemma,tableTitle:table.title,row:row.label,column,answers,advanced,sources:d.sources.filter(s=>safeUrl(s.url)).map(s=>({...s})),license:{...d.license}});
    });
   }
  }
 }
 return [...out.values()];
}
export function checkInflectionAnswer(question:InflectionQuestion,answer:string):boolean{const normalized=normalizeInflectionAnswer(answer);return !!normalized&&question.answers.some(a=>normalizeInflectionAnswer(a)===normalized);}
export function inflectionPracticeDay(date=new Date()):string{return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function validDay(day:unknown):day is string{if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;const date=new Date(day+'T12:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===day;}
function addDays(day:string,n:number):string{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
const nonnegative=(n:unknown):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;
export function isInflectionCellProgress(p:unknown):p is InflectionCellProgress{if(!p||typeof p!=='object')return false;const s=p as InflectionCellProgress;return typeof s.signature==='string'&&nonnegative(s.attempts)&&nonnegative(s.correct)&&s.correct<=s.attempts&&nonnegative(s.lapses)&&s.lapses<=s.attempts&&nonnegative(s.dayStreak)&&s.dayStreak<=s.correct&&Number.isInteger(s.intervalIndex)&&s.intervalIndex>=-1&&s.intervalIndex<INFLECTION_INTERVALS.length&&validDay(s.dueDay)&&validDay(s.lastAnsweredDay)&&(s.lastSuccessDay===null||validDay(s.lastSuccessDay))&&typeof s.lastWasCorrect==='boolean';}
function matchingProgress(question:InflectionQuestion,progress:InflectionProgress):InflectionCellProgress|undefined{const p=progress[question.id];return isInflectionCellProgress(p)&&p.signature===question.signature?p:undefined;}
/** Successes advance only when due and on distinct local calendar days. */
export function updateInflectionProgress(previous:InflectionCellProgress|undefined,question:InflectionQuestion,correct:boolean,day=inflectionPracticeDay()):InflectionCellProgress{
 if(!validDay(day))throw new Error('Geçersiz çalışma günü');
 const p=isInflectionCellProgress(previous)&&previous.signature===question.signature?previous:undefined;
 const result:InflectionCellProgress={signature:question.signature,attempts:(p?.attempts||0)+1,correct:(p?.correct||0)+(correct?1:0),lapses:(p?.lapses||0)+(correct?0:1),dayStreak:p?.dayStreak||0,intervalIndex:p?.intervalIndex??-1,dueDay:p?.dueDay||day,lastSuccessDay:p?.lastSuccessDay||null,lastAnsweredDay:day,lastWasCorrect:correct};
 if(!correct){result.dayStreak=0;result.intervalIndex=-1;result.dueDay=day;return result;}
 const canAdvance=(!p?.lastSuccessDay||day>p.lastSuccessDay)&&(!p||day>=p.dueDay);
 if(canAdvance){result.intervalIndex=Math.min(INFLECTION_INTERVALS.length-1,(p?.intervalIndex??-1)+1);result.dayStreak=(p?.dayStreak||0)+1;result.dueDay=addDays(day,INFLECTION_INTERVALS[result.intervalIndex]);result.lastSuccessDay=day;}
 else if(result.dueDay<=day){result.intervalIndex=Math.max(0,result.intervalIndex);result.dueDay=addDays(day,INFLECTION_INTERVALS[result.intervalIndex]);}
 return result;
}
/** Due cells only, last-wrong first; early practice is an explicit opt-in. */
export function buildInflectionQueue(questions:InflectionQuestion[],progress:InflectionProgress,day=inflectionPracticeDay(),includeEarly=false):string[]{
 if(!validDay(day))return[];
 return questions.filter(q=>{const p=matchingProgress(q,progress);return includeEarly||!p||p.dueDay<=day;}).map((q,i)=>({q,i})).sort((a,b)=>{
 const ap=matchingProgress(a.q,progress),bp=matchingProgress(b.q,progress);const rank=(p:InflectionCellProgress|undefined)=>p&&!p.lastWasCorrect?0:!p?1:2;
 return rank(ap)-rank(bp)||(ap?.dueDay||'').localeCompare(bp?.dueDay||'')||a.i-b.i;
 }).map(({q})=>q.id);
}
/** A wrong cell returns after two other queued cells where available. */
export function advanceInflectionQueue(queue:string[],correct:boolean):string[]{const [current,...rest]=queue;if(!current)return[];if(!correct)rest.splice(Math.min(2,rest.length),0,current);return rest;}
export function parseInflectionProgress(raw:string|null):{valid:boolean;progress:InflectionProgress}{
 if(raw===null)return{valid:true,progress:{}};
 try{const envelope=JSON.parse(raw);if(envelope?.version!==1||!envelope.progress||typeof envelope.progress!=='object'||Array.isArray(envelope.progress))return{valid:false,progress:{}};
 const entries=Object.entries(envelope.progress);if(!entries.every(([id,p])=>id.startsWith('infl-v1:')&&isInflectionCellProgress(p)))return{valid:false,progress:{}};
 return{valid:true,progress:Object.fromEntries(entries) as InflectionProgress};}catch{return{valid:false,progress:{}};}
}
